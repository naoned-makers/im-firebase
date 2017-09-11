
## Install Firebase CLI

### Reset database
```
firebase database:remove /
```
### Init database
```
firebase database:set / data.json
```

### Set client id and token in environnement variable with
```
firebase functions:config:set client.id=clientid
firebase functions:config:set client.key=clientsecrettoken

```
### Deploy
```
firebase deploy
```