package cm.hsjm.ged;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.MimeTypeMap;
import android.widget.Toast;
import androidx.core.content.FileProvider;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

/**
 * Enregistre dans « Téléchargements » un fichier transmis par la GED (contenu en
 * base64), puis propose de l'ouvrir.
 */
public class GedFichiers {

    private final Activity activity;

    GedFichiers(Activity activity) {
        this.activity = activity;
    }

    /** Vrai si le pont est disponible (utilisé par la GED pour le détecter). */
    @JavascriptInterface
    public boolean disponible() {
        return true;
    }

    /** Jeton Firebase de ce téléphone (vide tant qu'il n'est pas connu). */
    @JavascriptInterface
    public String jetonPush() {
        return GedMessagingService.jeton(activity);
    }

    /** Réglages du verrouillage par empreinte : {"disponible","actif","delai"} (JSON). */
    @JavascriptInterface
    public String verrouillage() {
        return ((MainActivity) activity).verrouillage().etatJson();
    }

    /**
     * Change les réglages du verrouillage après confirmation par empreinte ou code.
     * Le résultat est renvoyé à la GED par l'événement « ged-verrouillage »
     * (detail = { ok, disponible, actif, delai }).
     */
    @JavascriptInterface
    public void reglerVerrouillage(boolean actif, int delaiSecondes) {
        MainActivity a = (MainActivity) activity;
        a.runOnUiThread(() -> a.verrouillage().regler(actif, delaiSecondes, ok -> {
            String etat = a.verrouillage().etatJson();
            String js = "window.dispatchEvent(new CustomEvent('ged-verrouillage',{detail:Object.assign("
                + etat + ",{ok:" + ok + "})}))";
            a.getBridge().getWebView().evaluateJavascript(js, null);
        }));
    }

    /** @return vrai si le fichier a été enregistré. */
    @JavascriptInterface
    public boolean enregistrer(String base64, String nom, String mime) {
        try {
            byte[] octets = Base64.decode(base64, Base64.DEFAULT);
            String nomFichier = nettoyerNom(nom, mime);
            String type = (mime == null || mime.isEmpty()) ? deviner(nomFichier) : mime;

            Uri uri;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                uri = enregistrerMediaStore(octets, nomFichier, type);
            } else {
                uri = enregistrerDossierAppli(octets, nomFichier);
            }

            final Uri aOuvrir = uri;
            final String typeFinal = type;
            activity.runOnUiThread(() -> {
                Toast.makeText(activity, "Enregistré dans Téléchargements : " + nomFichier, Toast.LENGTH_LONG).show();
                ouvrir(aOuvrir, typeFinal);
            });
            return true;
        } catch (Exception e) {
            activity.runOnUiThread(() ->
                Toast.makeText(activity, "Échec de l'enregistrement du fichier", Toast.LENGTH_LONG).show());
            return false;
        }
    }

    private Uri enregistrerMediaStore(byte[] octets, String nom, String type) throws Exception {
        ContentResolver resolver = activity.getContentResolver();
        ContentValues valeurs = new ContentValues();
        valeurs.put(MediaStore.MediaColumns.DISPLAY_NAME, nom);
        valeurs.put(MediaStore.MediaColumns.MIME_TYPE, type);
        valeurs.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
        valeurs.put(MediaStore.MediaColumns.IS_PENDING, 1);
        Uri uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, valeurs);
        if (uri == null) throw new IllegalStateException("insert");
        try (OutputStream out = resolver.openOutputStream(uri)) {
            if (out == null) throw new IllegalStateException("flux");
            out.write(octets);
        }
        valeurs.clear();
        valeurs.put(MediaStore.MediaColumns.IS_PENDING, 0);
        resolver.update(uri, valeurs, null, null);
        return uri;
    }

    /** Android 9 et moins : dossier Téléchargements propre à l'appli (sans permission). */
    private Uri enregistrerDossierAppli(byte[] octets, String nom) throws Exception {
        File dossier = activity.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        if (dossier == null) dossier = activity.getFilesDir();
        File fichier = new File(dossier, nom);
        try (FileOutputStream out = new FileOutputStream(fichier)) {
            out.write(octets);
        }
        return FileProvider.getUriForFile(activity, activity.getPackageName() + ".fileprovider", fichier);
    }

    private void ouvrir(Uri uri, String type) {
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, type);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            activity.startActivity(intent);
        } catch (ActivityNotFoundException e) {
            // Aucune appli pour ce type : le fichier reste disponible dans Téléchargements.
        }
    }

    private static String nettoyerNom(String nom, String mime) {
        String n = (nom == null || nom.trim().isEmpty()) ? "document" : nom.trim();
        n = n.replaceAll("[\\\\/:*?\"<>|]", "-");
        if (!n.contains(".") && mime != null) {
            String ext = MimeTypeMap.getSingleton().getExtensionFromMimeType(mime);
            if (ext != null) n = n + "." + ext;
        }
        return n;
    }

    private static String deviner(String nom) {
        int i = nom.lastIndexOf('.');
        if (i >= 0) {
            String type = MimeTypeMap.getSingleton().getMimeTypeFromExtension(nom.substring(i + 1).toLowerCase());
            if (type != null) return type;
        }
        return "application/octet-stream";
    }
}
