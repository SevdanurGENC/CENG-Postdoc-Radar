.class public Lcom/sevdanur/postdocradar/ScanJob;
.super Landroid/app/job/JobService;
.source "ScanJob.java"


# instance fields
.field private web:Landroid/webkit/WebView;


# direct methods
.method public constructor <init>()V
    .registers 1

    invoke-direct {p0}, Landroid/app/job/JobService;-><init>()V

    return-void
.end method


# virtual methods
.method public onStartJob(Landroid/app/job/JobParameters;)Z
    .registers 5

    :try_start_0
    new-instance v0, Landroid/webkit/WebView;

    invoke-direct {v0, p0}, Landroid/webkit/WebView;-><init>(Landroid/content/Context;)V

    iput-object v0, p0, Lcom/sevdanur/postdocradar/ScanJob;->web:Landroid/webkit/WebView;

    new-instance v1, Lcom/sevdanur/postdocradar/Bridge;

    invoke-direct {v1, p0, p0, p1}, Lcom/sevdanur/postdocradar/Bridge;-><init>(Landroid/content/Context;Landroid/app/job/JobService;Landroid/app/job/JobParameters;)V

    invoke-static {v0, v1}, Lcom/sevdanur/postdocradar/Bridge;->setup(Landroid/webkit/WebView;Lcom/sevdanur/postdocradar/Bridge;)V

    const-string v2, "file:///android_asset/index.html"

    invoke-virtual {v0, v2}, Landroid/webkit/WebView;->loadUrl(Ljava/lang/String;)V
    :try_end_0
    .catch Ljava/lang/Exception; {:try_start_0 .. :try_end_0} :catch_0

    const/4 v0, 0x1

    return v0

    :catch_0
    const/4 v0, 0x0

    return v0
.end method

.method public onStopJob(Landroid/app/job/JobParameters;)Z
    .registers 3

    const/4 v0, 0x0

    return v0
.end method
