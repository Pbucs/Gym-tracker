Add-Type -AssemblyName System.Drawing

function Generate-Icon {
    param(
        [int]$Size,
        [string]$Path
    )

    $bmp = New-Object System.Drawing.Bitmap $Size, $Size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

    # Background gradient: Dark slate to deep black
    $p1 = New-Object System.Drawing.PointF 0, 0
    $p2 = New-Object System.Drawing.PointF $Size, $Size
    $cBg1 = [System.Drawing.Color]::FromArgb(255, 15, 23, 42)
    $cBg2 = [System.Drawing.Color]::FromArgb(255, 2, 6, 23)
    $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush ($p1, $p2, $cBg1, $cBg2)
    $g.FillRectangle($bgBrush, 0, 0, $Size, $Size)

    # Accent ring
    $ringColor = [System.Drawing.Color]::FromArgb(60, 59, 130, 246)
    $ringPen = New-Object System.Drawing.Pen ($ringColor, [float]($Size * 0.02))
    $margin = $Size * 0.08
    $g.DrawEllipse($ringPen, [float]$margin, [float]$margin, [float]($Size - 2 * $margin), [float]($Size - 2 * $margin))

    # Inner Glow Dumbbell Plates
    $cPlate1 = [System.Drawing.Color]::FromArgb(255, 59, 130, 246)  # Electric Blue #3B82F6
    $cPlate2 = [System.Drawing.Color]::FromArgb(255, 16, 185, 129)  # Emerald #10B981
    $plateBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush ($p1, $p2, $cPlate1, $cPlate2)

    # Dumbbell center bar
    $cx = [float]($Size / 2)
    $cy = [float]($Size / 2)
    $barW = [float]($Size * 0.58)
    $barH = [float]($Size * 0.075)

    $barBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 241, 245, 249))
    $g.FillRectangle($barBrush, ($cx - $barW/2), ($cy - $barH/2), $barW, $barH)

    # Plates geometry
    $innerPlateW = [float]($Size * 0.065)
    $innerPlateH = [float]($Size * 0.46)
    $outerPlateW = [float]($Size * 0.055)
    $outerPlateH = [float]($Size * 0.36)

    # Left Plates
    $lipX = $cx - $barW/2 + ($Size * 0.035)
    $g.FillRectangle($plateBrush, $lipX, ($cy - $innerPlateH/2), $innerPlateW, $innerPlateH)

    $lopX = $lipX - $outerPlateW - ($Size * 0.015)
    $g.FillRectangle($plateBrush, $lopX, ($cy - $outerPlateH/2), $outerPlateW, $outerPlateH)

    # Left Collar
    $collarW = [float]($Size * 0.03)
    $collarH = [float]($Size * 0.16)
    $collarBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 203, 213, 225))
    $g.FillRectangle($collarBrush, ($lipX + $innerPlateW + ($Size * 0.01)), ($cy - $collarH/2), $collarW, $collarH)

    # Right Plates
    $ripX = $cx + $barW/2 - ($Size * 0.035) - $innerPlateW
    $g.FillRectangle($plateBrush, $ripX, ($cy - $innerPlateH/2), $innerPlateW, $innerPlateH)

    $ropX = $ripX + $innerPlateW + ($Size * 0.015)
    $g.FillRectangle($plateBrush, $ropX, ($cy - $outerPlateH/2), $outerPlateW, $outerPlateH)

    # Right Collar
    $g.FillRectangle($collarBrush, ($ripX - $collarW - ($Size * 0.01)), ($cy - $collarH/2), $collarW, $collarH)

    $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Success: $Path"
}

$baseDir = "C:\Users\eduar\.gemini\antigravity\scratch\gym-tracker\icons"
Generate-Icon -Size 192 -Path "$baseDir\icon-192.png"
Generate-Icon -Size 512 -Path "$baseDir\icon-512.png"
Generate-Icon -Size 180 -Path "$baseDir\apple-touch-icon.png"
Generate-Icon -Size 64 -Path "$baseDir\favicon.png"
