import { Plugin, Notice, FileSystemAdapter, TAbstractFile, PluginSettingTab,Setting,App } from 'obsidian';
import { ChildProcess, SpawnOptionsWithoutStdio } from 'child_process';
import { spawn } from 'child_process';

// Remember to rename these classes and interfaces!


interface MyPluginSettings {
	branch: string;
	remote: string
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	branch: 'main',
	remote: 'origin'
}
export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	basepath: string;
	loadtime: Date;
	lastpush: Date;
	async onload() {
		await this.loadSettings();
		this.loadtime = new Date();
		this.lastpush = new Date();
		let adapter = this.app.vault.adapter
		if (adapter instanceof FileSystemAdapter) {
			this.basepath = adapter.getBasePath()
		}
		this.registerEvent(this.app.vault.on("modify",this.gitPush.bind(this)))
		this.registerEvent(this.app.vault.on("create",this.gitPush.bind(this)))
		this.registerEvent(this.app.vault.on("delete",this.gitPush.bind(this)))
		this.registerEvent(this.app.vault.on("rename",this.gitPush.bind(this)))
		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	async gitPush(file:TAbstractFile) {
		let adapter = file.vault.adapter
		let d = new Date()
		if (adapter instanceof FileSystemAdapter && (d.getTime() - this.loadtime.getTime())/1000 > 60 && (d.getTime() - this.lastpush.getTime())/1000 > 60) {
			this.spawnProcess("git",["add","."])
			this.spawnProcess("git",["commit","-m",`${file.name}@${d.toDateString().replace(" ","-")}`])
			this.spawnProcess("git",["push",this.settings.remote,this.settings.branch])
			this.lastpush = new Date();
		}
	}
	async spawnProcess(command:string,args?: readonly string[] | undefined) {
		if(this.basepath) {
			let process = spawn(command,args,{
				cwd: this.basepath
			})
			process.stdout.on('data', (data) => {
				new Notice(`stdout: ${data}`);
			  });
			
			process.stderr.on('data', (data) => {
				new Notice(`stderr: ${data}`);
			});
			
			process.on('close', (code) => {
				new Notice(`child process exited with code ${code}`);
			});
		}
	}
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Branch')
			.addText(text => text
				.setPlaceholder('Enter name of the branch you want to push')
				.setValue(this.plugin.settings.branch)
				.onChange(async (value) => {
					this.plugin.settings.branch = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
		.setName('Remote')
		.addText(text => text
			.setPlaceholder('Enter name of the remote you want to push to')
			.setValue(this.plugin.settings.remote)
			.onChange(async (value) => {
				this.plugin.settings.remote = value;
				await this.plugin.saveSettings();
			}));
		
	}
}