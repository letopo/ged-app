package cm.hsjm.ged;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebBackForwardList;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.google.firebase.messaging.FirebaseMessaging;

public class MainActivity extends BridgeActivity {

    private GedVerrouillage verrouillage;

    GedVerrouillage verrouillage() { return verrouillage; }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Pont « GedAndroid » utilisé par la GED (src/utils/androidApp.js) :
        // enregistrement des fichiers téléchargés et jeton des notifications.
        // Il est visible à partir du chargement suivant, c'est-à-dire dès l'ouverture
        // du serveur GED après la page locale de choix du serveur.
        viderCacheApresMiseAJour();
        verrouillage = new GedVerrouillage(this);
        getBridge().getWebView().addJavascriptInterface(new GedFichiers(this), "GedAndroid");

        // Touche retour d'Android : page précédente de la GED (sinon l'appli se fermait)
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                retour();
            }
        });

        GedMessagingService.creerCanal(this);
        demanderPermissionNotifications();
        try {
            FirebaseMessaging.getInstance().getToken().addOnSuccessListener(
                jeton -> GedMessagingService.memoriserJeton(this, jeton));
        } catch (Exception e) {
            // Firebase indisponible : l'appli fonctionne sans notifications.
        }

        // Lancement depuis une notification (appli fermée)
        String url = getIntent().getStringExtra(GedMessagingService.EXTRA_URL);
        if (url != null) ouvrirDepuisNotification(url, true);
    }

    @Override
    public void onStart() {
        super.onStart();
        if (verrouillage != null) verrouillage.revient();
    }

    @Override
    public void onStop() {
        super.onStop();
        if (verrouillage != null) verrouillage.quitte();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        String url = intent.getStringExtra(GedMessagingService.EXTRA_URL);
        if (url != null) ouvrirDepuisNotification(url, false);
    }

    /**
     * Après installation d'une nouvelle version de l'APK, vide le cache HTTP de la
     * WebView (pages et scripts de la GED) : évite d'afficher une ancienne version
     * du site. Le stockage local (serveur choisi, session) est conservé.
     */
    private void viderCacheApresMiseAJour() {
        try {
            long version = Build.VERSION.SDK_INT >= 28
                ? getPackageManager().getPackageInfo(getPackageName(), 0).getLongVersionCode()
                : getPackageManager().getPackageInfo(getPackageName(), 0).versionCode;
            android.content.SharedPreferences p = getSharedPreferences(GedMessagingService.PREFS, MODE_PRIVATE);
            if (p.getLong("versionCache", -1) != version) {
                getBridge().getWebView().clearCache(true);
                p.edit().putLong("versionCache", version).apply();
            }
        } catch (Exception e) {
            // sans conséquence
        }
    }

    /**
     * Revient à la page précédente de la GED. Sur la première page (ou si la page
     * précédente est la page locale de choix du serveur), l'appli passe en
     * arrière-plan sans être fermée, comme les autres applications Android.
     */
    private void retour() {
        WebView vue = getBridge().getWebView();
        WebBackForwardList hist = vue.copyBackForwardList();
        int i = hist.getCurrentIndex();
        if (i > 0) {
            String precedente = hist.getItemAtIndex(i - 1).getUrl();
            Uri u = precedente != null ? Uri.parse(precedente) : null;
            boolean pageLocale = u != null && "localhost".equals(u.getHost());
            if (!pageLocale) {
                vue.goBack();
                return;
            }
        }
        moveTaskToBack(true);
    }

    private void demanderPermissionNotifications() {
        if (Build.VERSION.SDK_INT >= 33
            && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[] { Manifest.permission.POST_NOTIFICATIONS }, 1);
        }
    }

    /**
     * Ouvre une page de la GED (chemin « /chat/… », « /mes-taches »…) sur le
     * serveur courant. Au démarrage, la page locale de choix du serveur s'en charge
     * (paramètre « ouvrir ») une fois le serveur joint.
     */
    private void ouvrirDepuisNotification(String chemin, boolean demarrage) {
        if (!chemin.startsWith("/")) return;
        WebView vue = getBridge().getWebView();
        String actuelle = demarrage ? null : vue.getUrl();
        Uri u = actuelle != null ? Uri.parse(actuelle) : null;
        if (u != null && "https".equals(u.getScheme()) && u.getHost() != null && !"localhost".equals(u.getHost())) {
            vue.loadUrl("https://" + u.getEncodedAuthority() + chemin);
        } else {
            vue.loadUrl("https://localhost/?ouvrir=" + Uri.encode(chemin));
        }
    }
}
