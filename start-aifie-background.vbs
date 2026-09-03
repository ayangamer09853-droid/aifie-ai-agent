' Aifie AI Agent Silent Background Launcher
' Starts the Aifie Node.js server silently in the background with no visible command prompt window.
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strCurrentDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = strCurrentDir

' Run node server.mjs silently (0 = hide window, False = don't wait for exit)
WshShell.Run "node server.mjs", 0, False
