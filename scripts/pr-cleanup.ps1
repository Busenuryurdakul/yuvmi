# PR duplicate cleanup — requires: gh auth login
$ErrorActionPreference = "Stop"
$Repo = "Busenuryurdakul/yuvmi"
$Root = Split-Path -Parent $PSScriptRoot

gh auth status | Out-Null

Write-Host "Closing PR #4..."
gh pr close 4 --repo $Repo --comment "Superseded by #5. feat/faz1-mvp-core branch'i artık kullanılmıyor; tüm commit'ler feat/ayse-faz1-faz2-mvp üzerinde."

Write-Host "Closing PR #6..."
gh pr close 6 --repo $Repo --comment "Duplicate of #5. Aynı branch (feat/ayse-faz1-faz2-mvp); canonical PR #5 -> feat/busenur-foundation-hardening."

Write-Host "Updating PR #5..."
gh pr edit 5 --repo $Repo `
    --title "feat: Faz 1-3 MVP — backend, mobil, sosyal alanlar ve premium" `
    --body-file "$Root\.github\pr-bodies\pr5-body.md"

Write-Host "Updating PR #3..."
gh pr edit 3 --repo $Repo --body-file "$Root\.github\pr-bodies\pr3-body.md"

Write-Host ""
Write-Host "Open PRs:"
gh pr list --repo $Repo --state open
