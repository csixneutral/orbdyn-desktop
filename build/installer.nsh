!macro closeOrbdyn
  DetailPrint "Closing running Orbdyn instances..."
  ExecWait 'cmd.exe /c taskkill /F /IM Orbdyn.exe /T' $0
  Sleep 1500
!macroend

!macro customInit
  !insertmacro closeOrbdyn
!macroend

!macro customUnInstall
  !insertmacro closeOrbdyn
!macroend
