package cm.hsjm.ged;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Pont « GedAndroid » utilisé par la GED (src/utils/androidApp.js) pour
        // enregistrer les fichiers téléchargés : la WebView ne sait pas le faire seule.
        // Il est visible à partir du chargement suivant, c'est-à-dire dès l'ouverture
        // du serveur GED après la page locale de choix du serveur.
        getBridge().getWebView().addJavascriptInterface(new GedFichiers(this), "GedAndroid");
    }
}
