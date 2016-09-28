# Sync-driven Whiteboard Quickstart

(based on the public quickstart)

This application should give you a ready-made starting point for writing your
own real-time apps with Sync. Before we begin, we need to collect
all the config values we need to run the application:

| Config Values  | Description |
| :-------------  |:------------- |
Account SID | Your primary Twilio account identifier - find this [in the console here](https://www.twilio.com/console).
API Key + Secret | Used to authenticate - [generate an API key pair here in the console](https://www.twilio.com/console/dev-tools/api-keys).
Service Instance SID | A [service](https://www.twilio.com/docs/api/sync/rest/services) instance where all the data for our application is stored and scoped. Generate one using the command below and your freshly-minted API Key credentials.

```bash
# Generate a Service Instance Sid
$ curl -X POST https://preview.twilio.com/Sync/Services \
       -u 'SKXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX:your_api_secret'
 ```

## A Note on API Keys

When you generate an API key pair at the URLs above, your API Secret will only
be shown once - make sure to save this in a secure location, 
or possibly your `~/.bash_profile`.

## Setting Up The Ruby (Sinatra) Application

This application uses the lightweight [Sinatra Framework](http://www.sinatrarb.com/). 
Begin by creating a configuration file for your application:

```bash
cp .env.example .env
```

Edit `.env` with the four configuration parameters we gathered from above.

Running the application is now like any standard ruby app.

```bash
$ bundle install
$ bundle exec ruby app.rb
```

Your application should now be running at [http://localhost:4567](http://localhost:4567). 
Open this page in a couple browsers or tabs, and start playing!

## License

MIT
