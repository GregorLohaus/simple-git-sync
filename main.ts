import { Plugin, Notice, FileSystemAdapter, TAbstractFile, PluginSettingTab,Setting,App } from 'obsidian';
import { ChildProcess, SpawnOptionsWithoutStdio } from 'child_process';
import { spawn, spawnSync } from 'child_process';


interface MyPluginSettings {
	branch: string;
	remote: string;
	mintime: string;
	noticetime: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	branch: 'main',
	remote: 'origin',
	mintime: '20',
	noticetime: '10'
}
type processChain= {
	command:string,
	args?: readonly string[] | undefined
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
		this.gitPull()
		this.registerEvent(this.app.vault.on("modify",this.gitPush.bind(this)))
		this.registerEvent(this.app.vault.on("create",this.gitPush.bind(this)))
		this.registerEvent(this.app.vault.on("delete",this.gitPush.bind(this)))
		this.registerEvent(this.app.vault.on("rename",this.gitPush.bind(this)))
		this.registerEvent(this.app.vault.on("closed",this.gitPush.bind(this)))
		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	async gitPull() {
		this.spawnProcessChain([
			{command:"git",args:["stash"]},
			{command:"git",args:["checkout",this.settings.branch]},
			{command:"git",args:["branch","-C",`localbackup/${this.settings.branch}@${this.loadtime.getDay()}-${this.loadtime.getMonth()}-${this.loadtime.getFullYear()}-${this.loadtime.getHours()}-${this.loadtime.getMinutes()}-${this.loadtime.getSeconds()}`]},
			{command:"git",args:["fetch",this.settings.remote,this.settings.branch]},
			{command:"git",args:["reset","--hard",`${this.settings.remote}/${this.settings.branch}`]},
			{command: "git",args:["stash","pop"]}
		])
	}

	async gitPush(file:TAbstractFile) {
		let adapter = file.vault.adapter
		let d = new Date()
		if (adapter instanceof FileSystemAdapter && (d.getTime() - this.loadtime.getTime())/1000 > Number(this.settings.mintime) && (d.getTime() - this.lastpush.getTime())/1000 > Number(this.settings.mintime)) {
			this.spawnProcessChain([
				{command:"git",args:["add","."]},
				{command:"git",args:["commit","-m",`${file.name}@${d.toUTCString()}`]},
				{command:"git",args:["push",this.settings.remote,this.settings.branch]}
			])
			this.lastpush = new Date();
		}
	}

	async spawnProcessChain(chain:processChain[]) {
		if(!this.basepath) {
			return false;
		}
		let c = chain.shift()
		if (c === undefined) {
			return false
		}
		let process = spawn(c.command,c.args,{
			cwd: this.basepath
		})
		process.stdout.on('data', (data) => {
			new Notice(`stdout: ${data}`,Number(this.settings.noticetime))*1000;
		  });
		
		process.stderr.on('data', (data) => {
			new Notice(`stderr: ${data}`,Number(this.settings.noticetime)*1000);
		});
		
		process.on('close', (code) => {
			new Notice(`child process ${c?.command} exited with code ${code}`,Number(this.settings.noticetime)*1000);
			if (code == 0) {
				this.spawnProcessChain(chain)
			}
		});
		return process
		
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
		new Setting(containerEl)
				.setName('Minimal Commit Delay')
				.addText(text => text
					.setPlaceholder('Enter minimal time to wait between commits in seconds')
					.setValue(this.plugin.settings.mintime)
					.onChange(async (value) => {
						this.plugin.settings.mintime = value;
						await this.plugin.saveSettings();
					}));
		new Setting(containerEl)
		.setName('Notice Display Time')
		.addText(text => text
			.setPlaceholder('Enter duration to display notices in seconds')
			.setValue(this.plugin.settings.noticetime)
			.onChange(async (value) => {
				this.plugin.settings.noticetime = value;
				await this.plugin.saveSettings();
			}));
	}
}