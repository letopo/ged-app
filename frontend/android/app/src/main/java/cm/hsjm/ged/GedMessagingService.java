package cm.hsjm.ged;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

/**
 * Notifications push de la GED (Firebase Cloud Messaging).
 * Le serveur envoie des messages « data » (titre, texte, url, tag) : on construit
 * la notification ici, appli ouverte ou fermée. Un appui ouvre la page « url ».
 */
public class GedMessagingService extends FirebaseMessagingService {

    static final String CANAL = "ged";
    static final String PREFS = "ged";
    static final String CLE_JETON = "jetonPush";
    static final String EXTRA_URL = "gedUrl";

    @Override
    public void onNewToken(@NonNull String jeton) {
        memoriserJeton(this, jeton);
    }

    static void memoriserJeton(Context ctx, String jeton) {
        ctx.getSharedPreferences(PREFS, MODE_PRIVATE).edit().putString(CLE_JETON, jeton).apply();
    }

    static String jeton(Context ctx) {
        SharedPreferences p = ctx.getSharedPreferences(PREFS, MODE_PRIVATE);
        return p.getString(CLE_JETON, "");
    }

    static void creerCanal(Context ctx) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel canal = new NotificationChannel(CANAL, "GED HSJM", NotificationManager.IMPORTANCE_HIGH);
            canal.setDescription("Tâches à valider, messages, documents reçus");
            ctx.getSystemService(NotificationManager.class).createNotificationChannel(canal);
        }
    }

    @Override
    public void onMessageReceived(@NonNull RemoteMessage message) {
        Map<String, String> d = message.getData();
        String titre = d.get("title");
        String texte = d.get("body");
        if (titre == null && message.getNotification() != null) {
            titre = message.getNotification().getTitle();
            texte = message.getNotification().getBody();
        }
        if (titre == null) return;
        String url = d.get("url");
        String tag = d.get("tag");

        creerCanal(this);
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        if (url != null) intent.putExtra(EXTRA_URL, url);
        int id = (tag != null ? tag : String.valueOf(System.currentTimeMillis())).hashCode();
        PendingIntent pi = PendingIntent.getActivity(this, id, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder b = new NotificationCompat.Builder(this, CANAL)
            .setSmallIcon(R.drawable.ic_stat_ged)
            .setColor(0xFF1B3A6B)
            .setContentTitle(titre)
            .setContentText(texte)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(texte))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pi);
        try {
            NotificationManagerCompat.from(this).notify(tag, id, b.build());
        } catch (SecurityException e) {
            // Permission de notification refusée par l'utilisateur.
        }
    }
}
