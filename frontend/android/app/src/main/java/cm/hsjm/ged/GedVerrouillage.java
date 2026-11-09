package cm.hsjm.ged;

import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.SystemClock;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import org.json.JSONObject;

/**
 * Verrouillage de l'application : empreinte, visage ou code du téléphone
 * (BiometricPrompt) à l'ouverture, et au retour après « délai » secondes
 * d'absence. Tant que l'appli est verrouillée, un écran opaque cache la GED.
 *
 * Réglages (SharedPreferences « ged ») : actif (oui par défaut), délai (60 s).
 * Sans empreinte ni code configuré sur le téléphone, l'appli n'est pas verrouillée.
 */
class GedVerrouillage {

    interface Rappel { void fini(boolean ok); }

    private static final String CLE_ACTIF = "verrouActif";
    private static final String CLE_DELAI = "verrouDelai";
    private static final int AUTORISES =
        BiometricManager.Authenticators.BIOMETRIC_WEAK | BiometricManager.Authenticators.DEVICE_CREDENTIAL;

    private final AppCompatActivity activite;
    private final SharedPreferences prefs;
    private FrameLayout ecran;
    private boolean verrouille = false;
    private boolean enCours = false;
    private long quitteA = -1; // -1 : démarrage à froid

    GedVerrouillage(AppCompatActivity activite) {
        this.activite = activite;
        this.prefs = activite.getSharedPreferences(GedMessagingService.PREFS, AppCompatActivity.MODE_PRIVATE);
    }

    boolean disponible() {
        return BiometricManager.from(activite).canAuthenticate(AUTORISES) == BiometricManager.BIOMETRIC_SUCCESS;
    }

    boolean actif() { return prefs.getBoolean(CLE_ACTIF, true); }

    int delai() { return prefs.getInt(CLE_DELAI, 60); }

    String etatJson() {
        try {
            return new JSONObject()
                .put("disponible", disponible())
                .put("actif", actif())
                .put("delai", delai())
                .toString();
        } catch (Exception e) {
            return "{}";
        }
    }

    /** Appelé dans onStop : l'appli passe en arrière-plan. */
    void quitte() {
        if (!enCours) quitteA = SystemClock.elapsedRealtime();
    }

    /** Appelé dans onStart : faut-il redemander l'empreinte ? */
    void revient() {
        if (enCours || verrouille) return;
        if (!actif() || !disponible()) return;
        boolean demarrage = quitteA < 0;
        long absence = demarrage ? Long.MAX_VALUE : SystemClock.elapsedRealtime() - quitteA;
        if (demarrage || absence >= delai() * 1000L) {
            afficherEcran();
            demander(ok -> { if (ok) retirerEcran(); });
        }
    }

    /** Modifie les réglages après confirmation par empreinte ou code. */
    void regler(boolean nouvelActif, int nouveauDelai, Rappel rappel) {
        if (!disponible()) { rappel.fini(false); return; }
        demander(ok -> {
            if (ok) {
                prefs.edit()
                    .putBoolean(CLE_ACTIF, nouvelActif)
                    .putInt(CLE_DELAI, Math.max(0, Math.min(nouveauDelai, 24 * 3600)))
                    .apply();
            }
            rappel.fini(ok);
        });
    }

    private void demander(Rappel rappel) {
        if (enCours) return;
        enCours = true;
        BiometricPrompt invite = new BiometricPrompt(activite, ContextCompat.getMainExecutor(activite),
            new BiometricPrompt.AuthenticationCallback() {
                @Override
                public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult r) {
                    enCours = false;
                    quitteA = SystemClock.elapsedRealtime();
                    rappel.fini(true);
                }

                @Override
                public void onAuthenticationError(int code, CharSequence message) {
                    enCours = false;
                    rappel.fini(false);
                }
                // onAuthenticationFailed : essai raté, l'invite reste affichée.
            });
        BiometricPrompt.PromptInfo info = new BiometricPrompt.PromptInfo.Builder()
            .setTitle("GED HSJM")
            .setSubtitle("Déverrouillez pour accéder à la GED")
            .setAllowedAuthenticators(AUTORISES)
            .build();
        invite.authenticate(info);
    }

    private void afficherEcran() {
        verrouille = true;
        if (ecran == null) ecran = construireEcran();
        if (ecran.getParent() == null) {
            activite.addContentView(ecran, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        }
        ecran.bringToFront();
    }

    private void retirerEcran() {
        verrouille = false;
        if (ecran != null && ecran.getParent() instanceof ViewGroup) {
            ((ViewGroup) ecran.getParent()).removeView(ecran);
        }
    }

    private int dp(int v) {
        return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, activite.getResources().getDisplayMetrics());
    }

    private FrameLayout construireEcran() {
        FrameLayout fond = new FrameLayout(activite);
        fond.setBackgroundColor(Color.WHITE);
        fond.setClickable(true); // bloque les touchers vers la GED
        fond.setFocusable(true);

        LinearLayout col = new LinearLayout(activite);
        col.setOrientation(LinearLayout.VERTICAL);
        col.setGravity(Gravity.CENTER_HORIZONTAL);

        ImageView icone = new ImageView(activite);
        icone.setImageResource(R.mipmap.ic_launcher_foreground);
        col.addView(icone, new LinearLayout.LayoutParams(dp(120), dp(120)));

        TextView titre = new TextView(activite);
        titre.setText("GED HSJM verrouillée");
        titre.setTextColor(0xFF14213D);
        titre.setTextSize(TypedValue.COMPLEX_UNIT_SP, 20);
        titre.setGravity(Gravity.CENTER);
        col.addView(titre);

        Button bouton = new Button(activite);
        bouton.setText("Déverrouiller");
        bouton.setAllCaps(false);
        bouton.setTextColor(Color.WHITE);
        bouton.setBackgroundColor(0xFF1B3A6B);
        bouton.setOnClickListener(v -> demander(ok -> { if (ok) retirerEcran(); }));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(dp(220), dp(52));
        lp.topMargin = dp(28);
        col.addView(bouton, lp);

        fond.addView(col, new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER));
        return fond;
    }
}
