Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c cd /d ""C:\Users\rcato\kanban_app"" && npm run dev", 0, False
