package cm.hsjm.ged;

import android.app.Activity;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.ColorFilter;
import android.graphics.Paint;
import android.graphics.PixelFormat;
import android.graphics.Rect;
import android.graphics.drawable.Drawable;
import android.os.Build;
import android.view.View;
import android.view.Window;
import androidx.annotation.NonNull;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

/**
 * Couleur de la barre de notification (haut) et de la barre de navigation (bas)
 * selon l'interface de la GED : la page envoie la couleur de son haut et de son
 * bas d'écran (src/utils/androidApp.js). Les icônes des barres passent en clair
 * ou en foncé pour rester lisibles.
 *
 * Android 15+ (bord à bord) : les barres sont transparentes et laissent voir le
 * fond de la fenêtre, d'où un fond en deux couleurs (moitié haute / moitié basse ;
 * la GED couvre le milieu). Versions antérieures : couleur des barres directement.
 */
final class GedBarres {

    private static int haut = Color.WHITE;
    private static int bas = Color.WHITE;
    // Fond réutilisé : changer de couleur ne redessine que le fond, sans recréer la vue
    private static FondDeuxCouleurs fond;
    private static Boolean hautClair, basClair;

    private GedBarres() {}

    static void appliquer(Activity a, int nouveauHaut, int nouveauBas) {
        if (fond != null && nouveauHaut == haut && nouveauBas == bas) return;
        haut = nouveauHaut;
        bas = nouveauBas;
        Window w = a.getWindow();
        View decor = w.getDecorView();
        if (fond == null || decor.getBackground() != fond) {
            fond = new FondDeuxCouleurs(haut, bas);
            decor.setBackground(fond);
        } else {
            fond.couleurs(haut, bas);
        }
        if (Build.VERSION.SDK_INT < 35) {
            w.setStatusBarColor(haut);
            w.setNavigationBarColor(bas);
        }
        icones(w, decor, false);
    }

    /** Style des icônes : modifié seulement s'il change (évite un redessin des barres). */
    private static void icones(Window w, View decor, boolean forcer) {
        boolean hc = clair(haut), bc = clair(bas);
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(w, decor);
        if (forcer || hautClair == null || hautClair != hc) c.setAppearanceLightStatusBars(hc);
        if (forcer || basClair == null || basClair != bc) c.setAppearanceLightNavigationBars(bc);
        hautClair = hc;
        basClair = bc;
    }

    /** Après un changement de configuration (thème du téléphone, rotation…). */
    static void reappliquer(Activity a) {
        Window w = a.getWindow();
        View decor = w.getDecorView();
        fond = new FondDeuxCouleurs(haut, bas);
        decor.setBackground(fond);
        if (Build.VERSION.SDK_INT < 35) {
            w.setStatusBarColor(haut);
            w.setNavigationBarColor(bas);
        }
        icones(w, decor, true);
    }

    /** Couleur claire → icônes foncées. */
    static boolean clair(int couleur) {
        double l = 0.2126 * Color.red(couleur) + 0.7152 * Color.green(couleur) + 0.0722 * Color.blue(couleur);
        return l > 150;
    }

    /** « #1b3a6b », « rgb(27, 58, 107) » ou « rgba(…) » ; null si illisible. */
    static Integer lire(String css) {
        if (css == null) return null;
        String s = css.trim().toLowerCase();
        try {
            if (s.startsWith("#")) return Color.parseColor(s);
            if (s.startsWith("rgb")) {
                String[] p = s.substring(s.indexOf('(') + 1, s.indexOf(')')).split("[,\\s/]+");
                return Color.rgb(Integer.parseInt(p[0].trim()), Integer.parseInt(p[1].trim()), Integer.parseInt(p[2].trim()));
            }
        } catch (Exception e) {
            return null;
        }
        return null;
    }

    private static final class FondDeuxCouleurs extends Drawable {
        private final Paint pHaut = new Paint();
        private final Paint pBas = new Paint();

        FondDeuxCouleurs(int haut, int bas) {
            pHaut.setColor(haut);
            pBas.setColor(bas);
        }

        void couleurs(int haut, int bas) {
            pHaut.setColor(haut);
            pBas.setColor(bas);
            invalidateSelf();
        }

        @Override
        public void draw(@NonNull Canvas canvas) {
            Rect r = getBounds();
            int milieu = r.top + r.height() / 2;
            canvas.drawRect(r.left, r.top, r.right, milieu, pHaut);
            canvas.drawRect(r.left, milieu, r.right, r.bottom, pBas);
        }

        @Override public void setAlpha(int alpha) {}
        @Override public void setColorFilter(ColorFilter cf) {}
        @Override public int getOpacity() { return PixelFormat.OPAQUE; }
    }
}
