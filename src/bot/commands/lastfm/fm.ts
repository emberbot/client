import { Command, Input } from '@api';
import { Emoji } from '@bot/libraries/emoji';
import request from 'request';
import { Response } from 'request';
import Jimp from 'jimp';
import { Framework } from '@core/framework';

export class LastFm extends Command {

    constructor() {
        super({
            name: 'lastfm',
            description: '',
            arguments: [
                {
                    name: 'action',
                    options: ['set', 'get', 'remove', 'album', 'artist', 'chart', 'albumchart', 'artistchart'],
                    default: 'get'
                },
                {
                    name: 'user',
                    constraint: 'string'
                }
            ]
        });
    }

    async execute(input: Input) {
        let db = input.member.settings;

        let action = input.getArgument('action') as string;
        let user = input.getArgument('user') as string | undefined;
        if (!user) { user = db.lastfmId; }

        let key = Framework.getConfig().authentication.lastfm.key;

        let lastfmURL = 'http://ws.audioscrobbler.com/2.0/?method=';
        let queryString = user + '&api_key= ' + key + '&limit=2&format=json';

        let nullText = '[undefined]';
        let nullURL = 'https://upload.wikimedia.org/wikipedia/commons/4/48/BLANK_ICON.png'

        switch(action) {
            case 'get':
                if (user && user != '') {
                    let requestURL = request((lastfmURL + 'user.getRecentTracks' + '&user=' + queryString), (error: any, response: Response, body: any) => {
                        if (error) {
                            input.channel.send(`${Emoji.ERROR}  Connection error! Unable to retrieve lastfm data.`);
                            return;
                        }

                        let parsed = JSON.parse(body);

                        if (parsed.recenttracks == undefined || parsed.recenttracks.track[0] == undefined) {
                            input.channel.send(`${Emoji.ERROR}  Connection error! Unable to retrieve lastfm data.`);
                            return;
                        }

                        let currentTrack = parsed.recenttracks.track[0];

                        let trackName = (currentTrack.name != undefined) ? currentTrack.name : nullText;
                        let artistName = (currentTrack.artist['#text'] != undefined) ? currentTrack.artist['#text'] : nullText;
                        let albumName = (currentTrack.album['#text'] != undefined) ? currentTrack.album['#text'] : nullText;
                        let albumImage = (currentTrack.image[1]['#text'] != undefined) ? currentTrack.image[1]['#text'] : nullURL;

                        let lastTrack = parsed.recenttracks.track[1];

                        let lastTrackName = (lastTrack.name != undefined) ? lastTrack.name : nullText;
                        let lastArtistName = (lastTrack.artist['#text'] != undefined) ? lastTrack.artist['#text'] : nullText;
                        let lastAlbumName = (lastTrack.album['#text'] != undefined) ? lastTrack.album['#text'] : nullText;

                        let description = 'Recently Played:';
                        let prefix = 'Last track:';
                        if (currentTrack.IsNowPlaying) {
                            description = 'Now Playing:';
                            prefix = 'Current:';
                        }

                        let icon = input.member.user.avatarURL({ format: 'png', dynamic: true, size: 2048 });
                        let uName = ', ' + input.member.displayName;

                        if (user != db.lastfmId) {
                            icon = nullURL;
                            uName = '';
                        }

                        input.channel.send( {
                            embed:
                            {
                                color: 3447003,
                                author: {
                                    name: user,
                                    icon_url: icon
                                },
                                title: user + uName,
                                url:  'https://www.last.fm/user/' + user,
                                description: description,
                                thumbnail: {
                                    url: albumImage
                                },
                                fields: [
                                    {
                                        name: prefix + ' ' + trackName,
                                        value: artistName + ' | ' + albumName
                                    },
                                    {
                                        name: 'Previous: ' + lastTrackName,
                                        value: lastArtistName + ' | ' + lastAlbumName
                                    }
                                ]
                            }
                        });
                    });
                } else {
                    input.channel.send('Please connect your lastfm account using `lastfm set <username>`');
                }
                break;
            case 'set':
                if (input.getArgument('user')) {
                    db.lastfmId = user;
                    input.channel.send('Lastfm username set to ' + user);
                } else {
                    input.channel.send('Please input a username');
                }
                break;
            case 'remove':
                db.lastfmId = '';
                input.channel.send('Lastfm username has been reset');
                break;
            case 'album':
                if (input.getArgument('user')) {
                    let requestURL = request((lastfmURL + 'album.search' + '&album=' + queryString), (error: any, response: Response, body: any) => {
                        if (error) {
                            input.channel.send(`${Emoji.ERROR}  Connection error! Unable to retrieve lastfm data.`);
                        }

                        let parsed = JSON.parse(body);

                        if (parsed.results.albummatches == undefined) {
                            input.channel.send(`${Emoji.ERROR}  Connection error! Unable to retrieve lastfm data.`);
                            return;
                        }

                        let album = parsed.results.albummatches.album[0];

                        input.channel.send( {
                            embed: {
                                color: 3447003,
                                title: album.name,
                                description: album.artist,
                                url: album.url,
                                image: {
                                    url: album.image[3]['#text']
                                }
                            }
                        })

                    });
                } else {
                    input.channel.send('Please input an album name. `lastfm album "<Album Name>"`');
                }
                break;
            case 'artist':
                if (input.getArgument('user')) {
                    let requestURL = request((lastfmURL + 'artist.search' + '&artist=' + queryString), (error: any, response: Response, body: any) => {
                        if (error) {
                            input.channel.send(`${Emoji.ERROR}  Connection error! Unable to retrieve lastfm data.`);
                            return;
                        }

                        let parsed = JSON.parse(body);

                        if (parsed.results.artistmatches == undefined || parsed.results.artistmatches.artist[0] == undefined) {
                            input.channel.send(`${Emoji.ERROR}  Unable to retrieve artist data.`);
                            return;
                        }

                        let id = parsed.results.artistmatches.artist[0].mbid;
                        let name = parsed.results.artistmatches.artist[0].name;

                        queryString = id + '&api_key= ' + key + '&limit=2&format=json';

                        let newRequestURL = request((lastfmURL + 'artist.getInfo&artist=' + name + '&mbid=' + queryString), (error: any, response: Response, body: any) => {

                            if (error) {
                                input.channel.send(`${Emoji.ERROR}  Connection error! Unable to retrieve lastfm data.`);
                                return;
                            }

                            let newParsed = JSON.parse(body);

                            if (newParsed.artist == undefined) {
                                input.channel.send(`${Emoji.ERROR}  Unable to retrieve artist data.`);
                                return;
                            }

                            let artist = newParsed.artist

                            input.channel.send( {
                                embed: {
                                    color: 3447003,
                                    title: artist.name,
                                    description: artist.bio.content.substring(0, Math.min(500, artist.bio.content.length)) + '[...](' + artist.url + ')',
                                    url: artist.url,
                                    image: {
                                        url: artist.image[3]['#text']
                                    },
                                    fields: [
                                        {
                                            name: 'Total listeners',
                                            value: artist.stats.listeners.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                                        },
                                        {
                                            name: 'Total playcount',
                                            value: artist.stats.playcount.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                                        }
                                    ]
                                }
                            })
                        })

                    });
                } else {
                    input.channel.send('Please input an artist name. `lastfm artist "<Artist Name>"`');
                }
                break;
            case 'chart':
            case 'albumchart':
                if (user && user != '') {
                    let currentTime = (Math.floor(new Date().getTime()/1000.0));
                    let from = currentTime-315569260;
                    if (input.getArgument('user')) {
                        switch(user) {
                            case 'week':
                            case 'weekly':
                                from = currentTime-604800;
                                break;
                            case 'month':
                            case 'monthly':
                                from = currentTime-2629743;
                                break;
                            case 'year':
                            case 'yearly':
                                from = currentTime-31556926;
                                break;
                            case 'all':
                            case 'alltime':
                                from = currentTime-315569260;
                                break;
                            default:
                                from = currentTime-315569260;
                        }
                    }

                    let requestURL = request((lastfmURL + 'user.getWeeklyAlbumChart' + '&user=' + db.lastfmId + '&from=' + from.toString() + '&to=' + currentTime.toString() + '&api_key= ' + key + '&format=json'), async (error: any, response: Response, body: any) => {
                        if (error) {
                            input.channel.send(`${Emoji.ERROR}  Connection error! Unable to retrieve lastfm data.`);
                            return;
                        }

                        let parsed = JSON.parse(body);

                        if (parsed.weeklyalbumchart == undefined) {
                            input.channel.send(`${Emoji.ERROR}  Connection error! Unable to retrieve lastfm data.`);
                            return;
                        }

                        let image : Jimp = await Jimp.read(pub('images/blankchart.png')) as Jimp;

                        let count = 0;
                        for (let i = 0; i < 3; i++) {
                            for (let j = 0; j < 3; j++) {
                                if (parsed.weeklyalbumchart.album[count].mbid != '') {
                                    let cover : Jimp = await Jimp.read(await this.getAlbumImage(parsed.weeklyalbumchart.album[count].name, parsed.weeklyalbumchart.album[count].artist['#text'], key)) as Jimp;
                                    image.composite(cover, 300*i, 300*j);
                                    await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK).then(font => {
                                        image.print(font, 300*i+2, 300*j+2, parsed.weeklyalbumchart.album[count].name);
                                    });
                                    await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE).then(font => {
                                        image.print(font, 300*i, 300*j, parsed.weeklyalbumchart.album[count].name);
                                    });
                                } else {
                                    j -= 1;
                                }
                                count++;
                            }
                        }

                        input.channel.send({
                            files: [await image.getBufferAsync(Jimp.MIME_PNG)]
                        });
                    });
                }  else {
                    input.channel.send('Please connect your lastfm account using `lastfm set <username>`');
                }
                break;
            case 'artistchart':
                if (user && user != '') {
                    let currentTime = (Math.floor(new Date().getTime()/1000.0));
                    let from = currentTime-315569260;
                    if (input.getArgument('user')) {
                        switch(user) {
                            case 'week':
                            case 'weekly':
                                from = currentTime-604800;
                                break;
                            case 'month':
                            case 'monthly':
                                from = currentTime-2629743;
                                break;
                            case 'year':
                            case 'yearly':
                                from = currentTime-31556926;
                                break;
                            case 'all':
                            case 'alltime':
                                from = currentTime-315569260;
                                break;
                            default:
                                from = currentTime-315569260;
                        }
                    }

                    let requestURL = request((lastfmURL + 'user.getWeeklyArtistChart' + '&user=' + db.lastfmId + '&from=' + from.toString() + '&to=' + currentTime.toString() + '&api_key= ' + key + '&format=json'), async (error: any, response: Response, body: any) => {
                        if (error) {
                            input.channel.send(`${Emoji.ERROR}  Connection error! Unable to retrieve lastfm data.`);
                            return;
                        }

                        let parsed = JSON.parse(body);

                        if (parsed.weeklyartistchart == undefined) {
                            input.channel.send(`${Emoji.ERROR}  Connection error! Unable to retrieve lastfm data.`);
                            return;
                        }

                        let image : Jimp = await Jimp.read(pub('images/blankchart.png')) as Jimp;

                        let count = 0;
                        for (let i = 0; i < 3; i++) {
                            for (let j = 0; j < 3; j++) {
                                if (parsed.weeklyartistchart.artist[count].mbid != '') {
                                    let artistImage : Jimp = await Jimp.read(await this.getArtistImage(parsed.weeklyartistchart.artist[count].name, key)) as Jimp;
                                    image.composite(artistImage, 300*i, 300*j);
                                    await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK).then(font => {
                                        image.print(font, 300*i+2, 300*j+2, parsed.weeklyartistchart.artist[count].name);
                                    });
                                    await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE).then(font => {
                                        image.print(font, 300*i, 300*j, parsed.weeklyartistchart.artist[count].name);
                                    });
                                } else {
                                    j -= 1;
                                }
                                count++;
                            }
                        }

                        input.channel.send({
                            files: [await image.getBufferAsync(Jimp.MIME_PNG)]
                        });
                    });
                }  else {
                    input.channel.send('Please connect your lastfm account using `lastfm set <username>`');
                }
                break;
            default:
                input.channel.send('Please connect your lastfm account using `lastfm set <username>`');
        }

        await db.save();
    }

    private getAlbumImage(name: string, artist: string, key: string) : Promise<string> {
        return new Promise(resolve => {
            let requestURL = request(('http://ws.audioscrobbler.com/2.0/?method=album.search&album=' + name + '&api_key= ' + key + '&format=json'), (error: any, response: Response, body: any) => {
                if (error) {
                    return;
                }

                let parsed = JSON.parse(body);

                if (parsed.results.albummatches == undefined) {
                    resolve('https://upload.wikimedia.org/wikipedia/commons/4/48/BLANK_ICON.png');
                    return;
                }

                let url = '';
                let result = 0;
                while (true) {
                    if (parsed.results.albummatches.album[result]) {
                        if (parsed.results.albummatches.album[result].artist == artist) {
                            url = parsed.results.albummatches.album[result].image[3]['#text'];
                            break;
                        } else {
                            result++;
                        }
                    } else {
                        break;
                    }
                }

                if (url == '') {
                    resolve('https://upload.wikimedia.org/wikipedia/commons/4/48/BLANK_ICON.png');
                    return;
                }

                resolve(url);

            });
        });
    }

    private getArtistImage(artist: string, key: string) : Promise<string> {
        return new Promise(resolve => {
            let requestURL = request(('http://ws.audioscrobbler.com/2.0/?method=artist.search&artist=' + artist + '&api_key= ' + key + '&format=json'), (error: any, response: Response, body: any) => {
                if (error) {
                    return;
                }

                let parsed = JSON.parse(body);

                if (parsed.results.artistmatches == undefined) {
                    resolve('https://upload.wikimedia.org/wikipedia/commons/4/48/BLANK_ICON.png');
                    return;
                }

                let url = '';
                if (parsed.results.artistmatches.artist[0]) {
                    url = parsed.results.artistmatches.artist[0].image[3]['#text'];
                }

                if (url == '') {
                    resolve('https://upload.wikimedia.org/wikipedia/commons/4/48/BLANK_ICON.png');
                    return;
                }

                resolve(url);

            });
        });
    }
}
