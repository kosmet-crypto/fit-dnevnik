package app.fitdnevnik;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

import java.time.LocalDate;

/**
 * Home screen widget: calories and protein left today. The page sends the (already translated)
 * numbers through MainActivity's bridge; tapping the widget opens the app.
 */
public class WidgetProvider extends AppWidgetProvider {

    static final String PREFS = "widget";

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) m.updateAppWidget(id, views(c));
    }

    static void refresh(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        int[] ids = m.getAppWidgetIds(new ComponentName(c, WidgetProvider.class));
        for (int id : ids) m.updateAppWidget(id, views(c));
    }

    private static RemoteViews views(Context c) {
        SharedPreferences p = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget);
        boolean today = LocalDate.now().toString().equals(p.getString("date", ""));
        if (today) {
            v.setTextViewText(R.id.w_big, p.getString("big", ""));
            v.setTextViewText(R.id.w_label, p.getString("label", ""));
            v.setTextViewText(R.id.w_sub, p.getString("sub", ""));
        } else {
            // A new day started and the app has not been opened yet.
            v.setTextViewText(R.id.w_big, "—");
            v.setTextViewText(R.id.w_label, c.getString(R.string.widget_open));
            v.setTextViewText(R.id.w_sub, "");
        }

        Intent open = new Intent(c, MainActivity.class);
        v.setOnClickPendingIntent(R.id.w_root, PendingIntent.getActivity(c, 0, open,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
        return v;
    }
}
