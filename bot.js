// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityTypes, CardFactory } = require('botbuilder');
const { DialogSet, NumberPrompt, ChoicePrompt, WaterfallDialog } = require('botbuilder-dialogs');
var PImage  = require('pureimage');
var MS      = require('memorystream');
var fs      = require('fs');
var {Base64Encode} = require('base64-stream');
var toString = require('stream-to-string')

// Turn counter property
const TURN_COUNTER_PROPERTY = 'turnCounterProperty';
const KLINGON_PROPERTY = 'klingonProperty';
const STARTBASES_PROPERTY = 'starBasesProperty';
const STARMAP_PROPERTY = 'starMapProperty';
const INITIAL_STARBASES_COUNT = 3;
const DIALOG_STATE_PROPERTY = 'dialogState';
const COMMAND_PROMPT = 'command_prompt';
const COMMANDS = ['SET COURSE',
                  'SHORT RANGE SENSOR SCAN', 
                  'LONG RANGE SENSOR SCAN', 
                  'FIRE PHASERS', 
                  'FIRE PHOTON TORPEDOES',
                  'SHIELD CONTROL',
                  'DAMAGE CONTROL REPORT', 
                  'CALL ON LIBRARY COMPUTER'];

class Responder {
  /**
   *
   * @param {ConversationState} conversation state object
   * @param {UserState} user state object
   */
  constructor(conversationState, userState) {
    this.countProperty = conversationState.createProperty(TURN_COUNTER_PROPERTY);
    this.klingonProperty = conversationState.createProperty(KLINGON_PROPERTY);
    this.starMapProperty = conversationState.createProperty(STARMAP_PROPERTY);
    this.starBasesProperty = conversationState.createProperty(STARTBASES_PROPERTY);
    this.conversationState = conversationState;
    this.userState = userState;
      
    this.dialogState = this.conversationState.createProperty(DIALOG_STATE_PROPERTY);
    this.dialogs = new DialogSet(this.dialogState);
    this.dialogs.add(new ChoicePrompt(COMMAND_PROMPT));

  }

  /**
   *
   * @param {TurnContext} on turn context object.
   */
  async onTurn(turnContext) {
    if (turnContext.activity.type === ActivityTypes.Message) {
      let start = false;
      let count = await this.countProperty.get(turnContext);
      count = count === undefined ? 1 : ++count;

      let klingons = await this.klingonProperty.get(turnContext);
      start =  (klingons === undefined);
      
      klingons = klingons === undefined ? 10 + Math.floor((Math.random() * 10) + 1) : klingons;

      let starBases = await this.starBasesProperty.get(turnContext);

      starBases = starBases === undefined ? INITIAL_STARBASES_COUNT : starBases;

      let starMap = await this.starMapProperty.get(turnContext);
      if (starMap === undefined) {
        starMap = this.setupMap(starBases, klingons);
      } else {
        starMap =JSON.parse(starMap);
      }

      console.log('Response: \'' + turnContext.activity.text + '\'');
 
      if (start || turnContext.activity.text == 'start') {
        await turnContext.sendActivity(`YOU MUST DESTROY ${klingons} KLINGONS IN 30 STARDATES WITH ${starBases} STARBASES`);
      } else if (turnContext.activity.text == 'commands') {
        const dc = await this.dialogs.createContext(turnContext);
        await dc.prompt(COMMAND_PROMPT, 'COMMANDS:', COMMANDS, { retryPrompt: 'COMMANDS:' });
      } else if (turnContext.activity.text == '1') {
        var card = await this.showShortRangeSensor(turnContext, starMap);
        await turnContext.sendActivity({ attachments: [card] });
      } else if (turnContext.activity.text == '2') {
        var card = await this.showLongRangeSensor(turnContext, starMap);
        await turnContext.sendActivity({ attachments: [card] });
     } else {
        await turnContext.sendActivity(`INVALID COMMAND: '${turnContext.activity.text}' `);
      }
     
      // Save the State
      await this.countProperty.set(turnContext, count);
      await this.klingonProperty.set(turnContext, klingons);
      await this.starBasesProperty.set(turnContext, starBases);
      await this.starMapProperty.set(turnContext, JSON.stringify(starMap));

    } else {
      await turnContext.sendActivity(`[${turnContext.activity.type} event detected]`);
    }
    
    await this.conversationState.saveChanges(turnContext);
  
  }

  checkArtifact(map, item) {

    next : for (var iMap = 0; iMap < map.length; iMap++) {

      if (item.qX !=  map[iMap].qX) {
        continue next;
      }

      if (item.qY !=  map[iMap].qY) {
        continue next;
      }

      if (item.sX !=  map[iMap].sX) {
        continue next;
      }

      if (item.sY !=  map[iMap].sY) {
        continue next;
      }

      return true;

    }

    return false;

  }

  setupMap(starbaseCount, klingonCount) {
    var map = [];
    
    // Enterprise
    map.push(
     {
        qX: Math.floor(Math.random() * 8),
        qY: Math.floor(Math.random() * 8),
        sX: Math.floor(Math.random() * 8),
        sY: Math.floor(Math.random() * 8),
        energy: 2000,
        status: 1,
        type: 1,
        photon: 10,     
        shields: 0
      });
    
    var starbase = null;

    do {
      starbase = {
        qX: Math.floor(Math.random() * 8),
        qY: Math.floor(Math.random() * 8),
        sX: Math.floor(Math.random() * 8),
        sY: Math.floor(Math.random() * 8),
        energy : 2000,
        status: 1,
        type: 2
      };
  
    } while (this.checkArtifact(map, starbase));
    
    for (var iKlingon = 0; iKlingon < klingonCount; iKlingon++) {
      var klingon = null;

      do {
        klingon = {
          qX: Math.floor(Math.random() * 8),
          qY: Math.floor(Math.random() * 8),
          sX: Math.floor(Math.random() * 8),
          sY: Math.floor(Math.random() * 8),
          energy : Math.floor(Math.random() * 1800) + 100,
          status: 1,
          type: 3
        };

      } while (this.checkArtifact(map, klingon));

      map.push(klingon);
      
    }

    for (var iStars = 0; iStars < 400; iStars++) {
      var star = null;

      do {
        star = {
          qX: Math.floor(Math.random() * 8),
          qY: Math.floor(Math.random() * 8),
          sX: Math.floor(Math.random() * 8),
          sY: Math.floor(Math.random() * 8),
          energy : Math.floor(Math.random() * 1800) + 100,
          status: 1,
          type: 4
        };

      } while (this.checkArtifact(map, star));

      map.push(star);
      
    }

    return map;

  }

  async showShortRangeSensor(turnContext, starMap) {
    
    function getSectorMap(starMap) {
      var sectorMap = [];
 
      for (var row = 0; row < 8; row++) {
        sectorMap.push([]);
        for (var column = 0; column < 8; column++) {
  
          sectorMap[row].push(0);
  
        }
  
      }
  
      var enterprise = starMap[0];
  
      for (var entry = 0; entry < starMap.length; entry++) {
        if (enterprise.qX == starMap[entry].qX && 
            enterprise.qY == starMap[entry].qY) {
            console.log('= ' + JSON.stringify(starMap[entry]));
            sectorMap[starMap[entry].sY][starMap[entry].sX] =  starMap[entry].type;
          }
  
        }
      var display = [];
      for (var row = 0; row < 8; row++) {
        var line = "|"
        for (var column = 0; column < 8; column++) {
          if (sectorMap[row][column] == 0) {
            line += '    ';
          } else if (sectorMap[row][column] == 1) {
            line += '<+> ';
          } else if (sectorMap[row][column] == 2) {
            line += '[*] ';
          } else if (sectorMap[row][column] == 3) {
            line += '>!< ';
          } else if (sectorMap[row][column] == 4) {
            line += ' *  ';
          }

        }
        
        line = line.replace(/.$/, "|");
  
        display.push(line);
      
      }

      return display;

    }
  
    function produceMap(starMap) {
      return new Promise((resolve, reject) => {
        var img = PImage.make(320,210);

        var fnt = PImage.registerFont('resources/fonts/NovaMono.ttf','NovaMono');
        fnt.load(() => {

          var sectorMap = getSectorMap(starMap);
   
          var ctx = img.getContext('2d');
          ctx.fillStyle = '#00ff00';

          ctx.font = "16pt 'NovaMono'";
          ctx.fillText("+---+---+---+---+---+---+---+---+", 10, 20);
 
          for (var line = 0; line < sectorMap.length; line++) {
            ctx.fillText(sectorMap[line], 10, 40 + line*20);
          }

          ctx.fillText("+---+---+---+---+---+---+---+---+", 10, 200);
 
          var memStream = new MS();
          var encodedStream = new Base64Encode({prefix:"data:image/jpg;base64,"});
          memStream.pipe(encodedStream);

          PImage.encodeJPEGToStream(img, memStream).then(() => {
            
            memStream.end();
            
            toString(encodedStream).then(function (msg) {
              resolve(msg);
            });

          });

        });

      });

    }

    async function generateMap(starMap) {
      try {
        var srImage = await produceMap(starMap);
      } catch (e) {
        console.log(e);
      }

      return srImage;
  
    }
    
    var srImage = await generateMap(starMap);
 
    var enterprise = starMap[0];
    return CardFactory.heroCard(
        `Quadrant: ${enterprise.qX}:${enterprise.qY}, Sector ${enterprise.sX}:${enterprise.sY}`,
        CardFactory.images([`${srImage}`]),
        CardFactory.actions()

    );
        
  }
  async showLongRangeSensor(turnContext, starMap) {
    return CardFactory.heroCard(
      `Quadrant: ${enterprise.qX}:${enterprise.qY}, Sector ${enterprise.sX}:${enterprise.sY}`,
      CardFactory.images([`${srImage}`]),
      CardFactory.actions()

    );

  }

}

module.exports.Bot = Responder;