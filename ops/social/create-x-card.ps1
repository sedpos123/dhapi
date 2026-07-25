param(
  [string]$Out = "ops/social/x-card-api-aggregator.png"
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

function Pen($hex, $w = 1) {
  return New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml($hex)), $w
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

$bg = Brush "#F8FAFC"
$g.FillRectangle($bg, 0, 0, $width, $height)

$fontTitle = New-Object System.Drawing.Font("Microsoft YaHei UI", 58, [System.Drawing.FontStyle]::Bold)
$fontSub = New-Object System.Drawing.Font("Microsoft YaHei UI", 28, [System.Drawing.FontStyle]::Regular)
$fontCardTitle = New-Object System.Drawing.Font("Microsoft YaHei UI", 30, [System.Drawing.FontStyle]::Bold)
$fontCardText = New-Object System.Drawing.Font("Microsoft YaHei UI", 22, [System.Drawing.FontStyle]::Regular)
$fontFooter = New-Object System.Drawing.Font("Microsoft YaHei UI", 20, [System.Drawing.FontStyle]::Regular)

$navy = Brush "#0F172A"
$muted = Brush "#475569"
$blue = Brush "#0369A1"
$white = Brush "#FFFFFF"
$linePen = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml("#D8E2EC")), 2

$g.DrawString("选 AI API 聚合中转站，先看这 5 点", $fontTitle, $navy, 90, 78)
$g.DrawString("不是越便宜越好，开发者真正需要的是可判断、可测试、可持续。", $fontSub, $muted, 94, 165)

$items = @(
  @{n="01"; t="模型覆盖"; d="是否覆盖 GPT / Claude / Gemini / DeepSeek，是否写清模型版本。"},
  @{n="02"; t="计费透明"; d="价格、倍率、充值门槛、余额规则是否能在接入前看懂。"},
  @{n="03"; t="文档清晰"; d="有没有 OpenAI 兼容说明、示例代码、错误处理和限制说明。"},
  @{n="04"; t="网站状态"; d="官网能否稳定访问，公告、状态页、支持入口是否容易找到。"},
  @{n="05"; t="小额测试"; d="先用非核心任务小额试用，再决定是否放进正式项目。"}
)

$startX = 90
$startY = 270
$cardW = 455
$cardH = 170
$gap = 34
for ($i = 0; $i -lt $items.Count; $i++) {
  $row = [Math]::Floor($i / 3)
  $col = $i % 3
  $x = $startX + $col * ($cardW + $gap)
  $y = $startY + $row * ($cardH + $gap)
  if ($i -eq 3) { $x = $startX + 245; $y = $startY + $cardH + $gap }
  if ($i -eq 4) { $x = $startX + 245 + $cardW + $gap; $y = $startY + $cardH + $gap }
  $path = RoundRect $x $y $cardW $cardH 26
  $g.FillPath($white, $path)
  $g.DrawPath($linePen, $path)
  $g.DrawString($items[$i].n, $fontCardTitle, $blue, $x + 26, $y + 24)
  $g.DrawString($items[$i].t, $fontCardTitle, $navy, $x + 92, $y + 24)
  $rect = New-Object System.Drawing.RectangleF ($x + 28), ($y + 82), ($cardW - 56), 70
  $g.DrawString($items[$i].d, $fontCardText, $muted, $rect)
}

$footerPath = RoundRect 90 790 1420 48 24
$g.FillPath((Brush "#E0F2FE"), $footerPath)
$g.DrawString("中转导航观察：先判断，再接入。把服务信息写清楚，本身就是获客能力。", $fontFooter, $blue, 130, 800)

$bmp.Save((Resolve-Path (Split-Path -Parent $Out)).Path + "\" + (Split-Path -Leaf $Out), [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
