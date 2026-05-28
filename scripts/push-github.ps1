# Uso: .\scripts\push-github.ps1 SEU_USUARIO
param(
  [Parameter(Mandatory = $true)]
  [string]$GitHubUser,

  [string]$RepoName = "primecell"
)

$remote = "https://github.com/$GitHubUser/$RepoName.git"

git remote remove origin 2>$null
git remote add origin $remote
git push -u origin main

Write-Host ""
Write-Host "Repositorio enviado para: $remote" -ForegroundColor Green
Write-Host "Proximo passo: importe em https://vercel.com/new" -ForegroundColor Cyan
