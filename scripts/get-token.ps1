Add-Type -AssemblyName System.Security
[void][Windows.Security.Credentials.PasswordVault,Windows.Security.Credentials,ContentType=WindowsRuntime]
$vault = New-Object Windows.Security.Credentials.PasswordVault
try {
  $creds = $vault.FindAllByResource('Supabase CLI:supabase')
  foreach ($item in $creds) {
    $item.RetrievePassword()
    $token = $item.Password
    [IO.File]::WriteAllText('D:\harvest-link-chain\.sb_token', $token)
    Write-Host "Found token starting with: $($token.Substring(0, 10))... Saved to .sb_token"
  }
} catch {
  Write-Host "Vault error: $($_.Exception.Message)"
}
