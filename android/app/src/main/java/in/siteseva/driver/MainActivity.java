package in.siteseva.driver;

import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.view.Gravity;
import android.view.View;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.CookieManager;
import android.content.Intent;
import android.net.Uri;
import android.widget.LinearLayout;
import android.widget.TextView;

public class MainActivity extends Activity {
    private static final String START_URL =
        "https://siteseva-platform-git-launch-foundation-siteseva.vercel.app/login";
    private WebView webView;
    private LinearLayout errorPanel;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(12, 24, 39));
        getWindow().setNavigationBarColor(Color.rgb(12, 24, 39));

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.WHITE);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.WHITE);
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setLoadsImagesAutomatically(true);
        webView.getSettings().setUserAgentString(webView.getSettings().getUserAgentString() + " SiteSevaAndroid/0.3.0");
        CookieManager.getInstance().setAcceptCookie(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.getSettings().setDatabaseEnabled(true);
        webView.getSettings().setSupportMultipleWindows(false);
        webView.getSettings().setJavaScriptCanOpenWindowsAutomatically(false);
        webView.getSettings().setAllowFileAccess(false);
        webView.getSettings().setAllowContentAccess(false);
        webView.getSettings().setMixedContentMode(
            android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW
        );
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                // SiteSeva pages stay inside this native app. Only third-party links open externally.
                Uri uri = request.getUrl();
                String host = uri.getHost();
                if ("https".equals(uri.getScheme()) && host != null &&
                    (host.equals("siteseva-platform-git-launch-foundation-siteseva.vercel.app") ||
                     (host.endsWith(".vercel.app") && host.startsWith("siteseva-platform-")))) {
                    return false;
                }
                if ("https".equals(uri.getScheme()) || "http".equals(uri.getScheme())) {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                }
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                errorPanel.setVisibility(View.GONE);
                webView.setVisibility(View.VISIBLE);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request,
                                        android.webkit.WebResourceError error) {
                if (request.isForMainFrame()) showError();
            }
        });

        errorPanel = new LinearLayout(this);
        errorPanel.setOrientation(LinearLayout.VERTICAL);
        errorPanel.setGravity(Gravity.CENTER);
        errorPanel.setPadding(32, 32, 32, 32);
        errorPanel.setVisibility(View.GONE);

        TextView message = new TextView(this);
        message.setText("SITE SEVA अभी कनेक्ट नहीं हो पाया। इंटरनेट जाँचकर दोबारा कोशिश करें।");
        message.setTextColor(Color.rgb(22, 39, 58));
        message.setTextSize(17);
        message.setGravity(Gravity.CENTER);
        errorPanel.addView(message);

        TextView retry = new TextView(this);
        retry.setText("  दोबारा कोशिश करें  ");
        retry.setTextColor(Color.WHITE);
        retry.setTextSize(16);
        retry.setGravity(Gravity.CENTER);
        retry.setPadding(24, 18, 24, 18);
        retry.setBackgroundColor(Color.rgb(15, 96, 170));
        LinearLayout.LayoutParams retryParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        retryParams.topMargin = 24;
        errorPanel.addView(retry, retryParams);
        retry.setOnClickListener(v -> webView.loadUrl(START_URL));

        root.addView(webView, new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, 0, 1));
        root.addView(errorPanel, new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, 0, 1));
        setContentView(root);

        if (savedInstanceState == null) webView.loadUrl(START_URL);
        else webView.restoreState(savedInstanceState);
    }

    private void showError() {
        webView.setVisibility(View.GONE);
        errorPanel.setVisibility(View.VISIBLE);
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
        }
        super.onDestroy();
    }
}
