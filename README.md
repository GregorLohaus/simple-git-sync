# Simple Obsidian git sync plugin 

Just autocommits and pushes changes to manually configured git remote 

on opening the following operations are performed: 
- stash 
- checkout configured branch
- create backup branch 
- fetch configured branch from configured remote 
- set branch tip to remote branch tip
- pop stash

all git output is displayed as notices

branch and remote name aswell as minimum distance between commits and duration of notice display can be configured in the settings 


currently only works with ssh-agent 

