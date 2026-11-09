package cm.hsjm.ged;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.google.firebase.messaging.FirebaseMessaging;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Pont « GedAndroid » utilisé par la GED (src/utils/androidApp.js) :
        // enregistrement des fichiers téléchargés et jeton des notifications.
        // Il est visible à partir du chargement suivant, c'est-à-dire dès l'ouverture
        // du serveur GED après la page locale de choix du serveur.
        getBridge().getWebView().addJavascriptInterface(new GedFichiers(this), "GedAndroid");

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
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        String url = intent.getStringExtra(GedMessagingService.EXTRA_URL);
        if (url != null) ouvrirDepuisNotification(url, false);
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
