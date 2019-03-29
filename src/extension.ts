import * as os from 'os';
import * as path from "path";
import * as vscode from 'vscode';

// POV-Ray Extension Activation
export function activate(context: vscode.ExtensionContext) {

    registerTasks();
    registerCommands(context);

}

function registerTasks() {
    const taskType = "povray"; //This is the taskDefinitions type defined in package.json
    
    // create a task provider
    const povrayTaskProvider = {

        provideTasks(token?: vscode.CancellationToken) {

            /****************************************/
            /* POV-Ray Render Scene File Build Task */
            /****************************************/

            // Get the currently open file name and extension
            let fileName = undefined;
            let fileExt = undefined;
            if (vscode.window.activeTextEditor !== undefined) {
                fileName = vscode.window.activeTextEditor.document.fileName;
                fileExt = path.extname(fileName);
            }
            
            // Get the POV-Ray settings
            const settings = vscode.workspace.getConfiguration('povray');
            let outputPath = (<string>settings.get("outputPath")).trim();
            const renderWidth = <string>settings.get("defaultRenderWidth");
            const renderHeight = <string>settings.get("defaultRenderHeight");
            let libraryPath = (<string>settings.get("libraryPath")).trim();

            // Default to running an executable called povray (Linux, Mac, WSL Ubuntu Bash, Git Bash)
            let cmd = "povray";

            // Make sure that if the user has specified an output path that it ends wth a slash
            // because POV-Ray on Windows wont recognize it is a folder unless it ends with a slash
            if (outputPath.length > 0 && !outputPath.endsWith('/') && !outputPath.endsWith('\\')) {
                outputPath += "/";
            }

            // Make sure that if the user has specified a library path that it ends wth a slash
            // because POV-Ray on Windows wont recognize it is a folder unless it ends with a slash
            if (libraryPath.length > 0 && !libraryPath.endsWith('/') && !libraryPath.endsWith('\\')) {
                libraryPath += "/";
            }

            // If we are running on Windows
            if (os.platform() === 'win32') {

                // Find out which shell VS Code is using for Windows
                const terminalSettings = vscode.workspace.getConfiguration("terminal");
                const shell = <string>terminalSettings.get("integrated.shell.windows");

                // If the windows shell is not set to use WSL Bash or Git Bash
                if (shell !== undefined && shell.indexOf("bash") === -1) {

                    // Change the povray executable to the windows pvengine instead
                    cmd = "pvengine /EXIT /RENDER";

                    // Normalize the outpath to make sure that it works for Windows
                    if (outputPath.length > 0) { 
                        outputPath = path.normalize(outputPath);
                    }

                    // Normalize the library path to make sure that it works for Windows
                    if (libraryPath.length > 0) { 
                        libraryPath = path.normalize(libraryPath);
                    }
                    
                }
            }

            // Start building the render command that will be run in the shell
            let renderCmd = cmd + " ${fileBasename} -D";
            
            // if this is a .pov file pass the default render width and height from the settings
            // as commandline arguments, otherwise we assume that the .ini file will include 
            // width and height instructions
            if (fileExt !== undefined && fileExt === ".pov") {
                renderCmd += " Width="+renderWidth+" Height="+renderHeight;
            }

            // If the user has set an output path for rendered files, 
            // add the output path as a commandline argument
            if (outputPath.length > 0) {
                renderCmd += " Output_File_Name="+outputPath;
            }

            // If the user has set library path, 
            // add the library path as a commandline argument
            if (libraryPath.length > 0) {
                renderCmd += " Library_Path="+libraryPath;
            }
            
            // For the build task, execute povray as a shell command
            const execution = new vscode.ShellExecution(renderCmd);

            // Use the $povray problem matcher defined in the package.json problemMatchers
            const problemMatchers = ["$povray"];

            // define the build task
            const buildTask = new vscode.Task(
                {type: taskType}, 
                vscode.TaskScope.Workspace, 
                "Render Scene", 
                "POV-Ray", 
                execution, 
                problemMatchers);

            // set the task as part of the Build task group    
            buildTask.group = vscode.TaskGroup.Build;
            buildTask.presentationOptions.clear = true;
            buildTask.presentationOptions.showReuseMessage = false;
            buildTask.runOptions.reevaluateOnRerun = true;

            // return an array of tasks for this provider
            return [
                buildTask
            ];
        },

        resolveTask(task: vscode.Task, token?: vscode.CancellationToken) {
            return task;
        }
    };

    // Register the povray task provider with VS Code
    vscode.tasks.registerTaskProvider(taskType, povrayTaskProvider);
}

function registerCommands(context: vscode.ExtensionContext) {

    const renderCommand = 'povray.render';
    
    // Create a command handler for running the POV-Ray Render Build Task
    const renderCommandHandler = (uri:vscode.Uri) => {

        // Fetch all of the povray tasks
        vscode.tasks.fetchTasks({type: "povray"}).then((tasks) => {
            // Loop through the tasks and find the Render Scene Build Task
            tasks.forEach(task => {
                if (task.group === vscode.TaskGroup.Build && task.name === "Render Scene") {
                    // Execute the task
                    vscode.tasks.executeTask(task);
                }
            });
        });
    };

    // Register the render command handler and add it to the context subscriptions
    context.subscriptions.push(vscode.commands.registerCommand(renderCommand, renderCommandHandler));
    
}