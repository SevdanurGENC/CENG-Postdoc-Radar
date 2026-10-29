.class public Lcom/sevdanur/postdocradar/MainActivity;
.super Landroid/app/Activity;
.source "MainActivity.java"


# instance fields
.field private web:Landroid/webkit/WebView;


# direct methods
.method public constructor <init>()V
    .registers 1

    invoke-direct {p0}, Landroid/app/Activity;-><init>()V

    return-void
.end method


# virtual methods
.method protected onCreate(Landroid/os/Bundle;)V
    .registers 7

    invoke-super {p0, p1}, Landroid/app/Activity;->onCreate(Landroid/os/Bundle;)V

    new-instance v0, Landroid/webkit/WebView;

    invoke-direct {v0, p0}, Landroid/webkit/WebView;-><init>(Landroid/content/Context;)V

    iput-object v0, p0, Lcom/sevdanur/postdocradar/MainActivity;->web:Landroid/webkit/WebView;

    new-instance v1, Lcom/sevdanur/postdocradar/Bridge;

    const/4 v2, 0x0

    invoke-direct {v1, p0, v2, v2}, Lcom/sevdanur/postdocradar/Bridge;-><init>(Landroid/content/Context;Landroid/app/job/JobService;Landroid/app/job/JobParameters;)V

    invoke-static {v0, v1}, Lcom/sevdanur/postdocradar/Bridge;->setup(Landroid/webkit/WebView;Lcom/sevdanur/postdocradar/Bridge;)V

    invoke-virtual {p0, v0}, Lcom/sevdanur/postdocradar/MainActivity;->setContentView(Landroid/view/View;)V

    sget v2, Landroid/os/Build$VERSION;->SDK_INT:I

    const/16 v3, 0x21

    if-lt v2, v3, :skip_perm

    const/4 v2, 0x1

    new-array v2, v2, [Ljava/lang/String;

    const/4 v3, 0x0

    const-string v4, "android.permission.POST_NOTIFICATIONS"

    aput-object v4, v2, v3

    const/4 v3, 0x1

    invoke-virtual {p0, v2, v3}, Lcom/sevdanur/postdocradar/MainActivity;->requestPermissions([Ljava/lang/String;I)V

    :skip_perm
    invoke-static {p0}, Lcom/sevdanur/postdocradar/Bridge;->ensureJob(Landroid/content/Context;)V

    const-string v2, "file:///android_asset/index.html"

    invoke-virtual {v0, v2}, Landroid/webkit/WebView;->loadUrl(Ljava/lang/String;)V

    return-void
.end method

.method public onBackPressed()V
    .registers 3

    iget-object v0, p0, Lcom/sevdanur/postdocradar/MainActivity;->web:Landroid/webkit/WebView;

    if-eqz v0, :cond_default

    invoke-virtual {v0}, Landroid/webkit/WebView;->canGoBack()Z

    move-result v1

    if-eqz v1, :cond_default

    invoke-virtual {v0}, Landroid/webkit/WebView;->goBack()V

    return-void

    :cond_default
    invoke-super {p0}, Landroid/app/Activity;->onBackPressed()V

    return-void
.end method
