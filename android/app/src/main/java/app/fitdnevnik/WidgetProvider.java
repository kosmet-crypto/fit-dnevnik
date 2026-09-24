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
import java.util.Locale;

/**
 * Home screen widget: calories and protein left today, water, and a button that adds a glass
 * of water without opening the app. The page sends the (already translated) numbers through
 * MainActivity's bridge; glasses added here are handed back to the page the next time it opens.
 */
public class WidgetProvider extends AppWidgetProvider {

    static final String PREFS = "widget";
    private static final String ACTION_WATER = "app.fitdnevnik.ADD_WATER";

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) m.updateAppWidget(id, views(c));
    }

    @Override
    public void onReceive(Context c, Intent i) {
        super.onReceive(c, i);
        if (ACTION_WATER.equals(i.getAction())) {
            SharedPreferences p = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            p.edit().putInt("pendingWater", p.getInt("pendingWater", 0) + 1).apply();
            refresh(c);
        }
    }

    static void refresh(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        int[] ids = m.getAppWidgetIds(new ComponentName(c, WidgetProvider.class));
        for (int id : ids) m.updateAppWidget(id, views(c));
    }

    private static String liters(int ml) {
        return String.format(Locale.getDefault(), "%.2f L", ml / 1000.0);
    }

    private static RemoteViews views(Context c) {
        SharedPreferences p = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget);
        boolean today = LocalDate.now().toString().equals(p.getString("date", ""));
        int glass = p.getInt("glass", 250);
        int water = (today ? p.getInt("waterMl", 0) : 0) + p.getInt("pendingWater", 0) * glass;
        int goal = p.getInt("waterGoal", 2250);
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
        String wl = p.getString("waterLabel", "");
        v.setTextViewText(R.id.w_water, "💧 " + liters(water) + " / " + liters(goal) + (wl.isEmpty() ? "" : " " + wl));

        Intent open = new Intent(c, MainActivity.class);
        v.setOnClickPendingIntent(R.id.w_root, PendingIntent.getActivity(c, 0, open,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
        Intent add = new Intent(c, WidgetProvider.class).setAction(ACTION_WATER);
        v.setOnClickPendingIntent(R.id.w_add, PendingIntent.getBroadcast(c, 1, add,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
        return v;
    }
}
