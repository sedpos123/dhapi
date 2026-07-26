param(
  [string]$Out = "ops/social/x-card-500-providers.png"
)

Add-Type -AssemblyName System.Drawing

$dir = Split-Path -Parent $Out
if ($dir -and -not (Test-Path $dir)) {
  New-Item -ItemType Directory -Path $dir | Out-Null
}

$width = 1600
$height = 900
$bmp = New-Object System.Drawing.Bitmap $width, $height
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

function Brush($hex) {
  return New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($hex))
}

function RoundRect($x, $y, $w, $h, $r) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

$bg = Brush "#FFF7ED"
$cream = Brush "#FFFBEB"
$navy = Brush "#111827"
$muted = Brush "#64748B"
$accent = Brush "#C2410C"
$green = Brush "#15803D"
$white = Brush "#FFFFFF"
$line = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml("#FED7AA")), 2
$softLine = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml("#FDBA74")), 2

$g.FillRectangle($bg, 0, 0, $width, $height)
for ($x = 80; $x -lt $width; $x += 120) {
  $g.DrawLine($line, $x, 0, $x, $height)
}
for ($y = 60; $y -lt $height; $y += 120) {
  $g.DrawLine($line, 0, $y, $width, $y)
}

$fontEyebrow = New-Object System.Drawing.Font("Microsoft YaHei UI", 23, [System.Drawing.FontStyle]::Bold)
$fontTitle = New-Object System.Drawing.Font("Microsoft YaHei UI", 64, [System.Drawing.FontStyle]::Bold)
$fontSub = New-Object System.Drawing.Font("Microsoft YaHei UI", 30, [System.Drawing.FontStyle]::Regular)
$fontBig = New-Object System.Drawing.Font("Microsoft YaHei UI", 76, [System.Drawing.FontStyle]::Bold)
$fontCard = New-Object System.Drawing.Font("Microsoft YaHei UI", 28, [System.Drawing.FontStyle]::Bold)
$fontFooter = New-Object System.Drawing.Font("Microsoft YaHei UI", 20, [System.Drawing.FontStyle]::Regular)

$pill = RoundRect 90 70 430 50 25
$g.FillPath($cream, $pill)
$g.DrawPath($softLine, $pill)
$g.DrawString("DHAPI Directory - Curated List", $fontEyebrow, $accent, 118, 80)

$g.DrawString("500 AI API Providers", $fontTitle, $navy, 90, 160)
$g.DrawString("Aggregator Directory", $fontTitle, $navy, 90, 250)
$g.DrawString("Models, pricing, site status, promotions and reviews in one comparison view.", $fontSub, $muted, 96, 355)

$cards = @(
  @{n="492"; t="Aggregators"; c=$accent},
  @{n="8"; t="Official refs"; c=$green},
  @{n="Daily"; t="Site status checks"; c=$navy}
)

for ($i = 0; $i -lt $cards.Count; $i++) {
  $x = 90 + $i * 490
  $path = RoundRect $x 475 430 230 30
  $g.FillPath($white, $path)
  $g.DrawPath($softLine, $path)
  $g.DrawString($cards[$i].n, $fontBig, $cards[$i].c, $x + 38, 520)
  $g.DrawString($cards[$i].t, $fontCard, $navy, $x + 42, 630)
}

$footerPath = RoundRect 90 780 1420 54 27
$g.FillPath($cream, $footerPath)
$g.DrawPath($softLine, $footerPath)
$g.DrawString("https://dhapi.pages.dev/  -  Filter by models / pricing / status / promotions / reviews", $fontFooter, $accent, 126, 793)

$outPath = Join-Path (Resolve-Path $dir).Path (Split-Path -Leaf $Out)
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
