$content = [System.IO.File]::ReadAllText("c:\Users\Vip\Documents\GitHub\SmartEnglish-Learning-Platform\clone.txt")
$idx = $content.IndexOf('<div id="__next">')
$out = $content.Substring($idx, [Math]::Min(50000, $content.Length - $idx))
$out | Out-File -Encoding UTF8 "c:\Users\Vip\Documents\GitHub\SmartEnglish-Learning-Platform\extracted_next.txt"
Write-Host "Extracted to extracted_next.txt, length: $($out.Length)"
