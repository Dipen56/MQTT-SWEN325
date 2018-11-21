import {Component, ViewChild} from '@angular/core';
import {NavController, Events, AlertController, Platform} from 'ionic-angular';
import {Storage} from '@ionic/storage';
import {Chart} from 'chart.js';
import { LocalNotifications } from '@ionic-native/local-notifications';

declare var Paho: any;

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {
  private mqttStatus: string = 'Disconnected';
  private connectionStatus = false;
  private mqttClient: any = null;
  private message: any = '';
  private messageToSend: string = 'Your message';
  private topic: string = 'swen325/a3';
  private clientId: string = 'yourName'
  private messages: any = [];
  private data: any = [0, 0, 0, 0, 0];
  private dateTime:string;
  private location: string ="At Home";
  private showNotification: boolean =false;
  @ViewChild('barCanvas') barCanvas;

  barChart: any;

  constructor(public navCtrl: NavController, private storage: Storage, public events: Events, private localNotification: LocalNotifications, private plt: Platform, private alertCtrl: AlertController) {
    if (this.plt.is('cordova')) {
      this.plt.ready().then((rdy) => {
        this.localNotification.on('click').subscribe(notification => {
          let json = JSON.parse(notification.data);
          let alert = this.alertCtrl.create({
            title: notification.title,
            subTitle: json.mydata

          })
        });

      });
    }
    // This is used to check when the application is in the background.
    document.addEventListener("pause", this.onPause, false);
    this.storage.set('message', []);
    this.storage.set("livingBattery",0);
    this.storage.set("kitchenBattery", 0);
    this.storage.set("diningBattery", 0);
    this.storage.set("toiletBattery", 0);
    this.storage.set("bedroomBattery", 0);
    this.connect();
    this.sendMessage();
  }
  public onPause(){
    console.log("Running in the background");
    this.localNotification.schedule({
      id: 1,
      title: "Attention",
      text: "Check on the senior! Last seen "+ this.dateTime,
      data: {mydata: 'RIP Senior is dead...'},
      foreground: true
    });
  }
  public connect = () => {
    this.mqttStatus = 'Connecting...';
    //this.mqttClient = new Paho.MQTT.Client('m10.cloudmqtt.com', 36492, '/mqtt', this.clientId);
    this.mqttClient = new Paho.MQTT.Client('barretts.ecs.vuw.ac.nz', 8883, '/mqtt', this.clientId);
    //this.mqttClient = new Paho.MQTT.Client('localhost', 22389, '/mqtt', this.clientId);


    // set callback handlers
    this.mqttClient.onConnectionLost = this.onConnectionLost;
    this.mqttClient.onMessageArrived = this.onMessageArrived;

    // connect the client
    console.log('Connecting to mqtt via websocket');
    //this.mqttClient.connect({timeout:10, userName:'ptweqash', password:'ncU6vlGPp1mN', useSSL:true, onSuccess:this.onConnect, onFailure:this.onFailure});
    this.mqttClient.connect({timeout: 10, useSSL: false, onSuccess: this.onConnect, onFailure: this.onFailure});
  }

  public disconnect() {
    if (this.mqttStatus == 'Connected') {
      this.mqttStatus = 'Disconnecting...';
      this.mqttClient.disconnect();
      this.connectionStatus = false;
      this.mqttStatus = 'Disconnected';
    }
  }

  public sendMessage() {
    if (this.mqttStatus == 'Connected') {
      this.mqttClient.publish(this.topic, this.messageToSend);
    }
  }

  public onConnect = () => {
    console.log('Connected');
    this.mqttStatus = 'Connected';
    this.connectionStatus = true;
    // subscribe
    this.mqttClient.subscribe(this.topic);
  }

  public onFailure = (responseObject) => {
    console.log('Failed to connect');
    this.mqttStatus = 'Failed to connect';
    this.connectionStatus = false;
  }

  public onConnectionLost = (responseObject) => {
    if (responseObject.errorCode !== 0) {
      this.mqttStatus = 'Disconnected';
      this.connectionStatus = false;
    }
  }

  public onMessageArrived = (message) => {
    console.log('Received message');
    this.message = message.payloadString;
    this.messages.push(this.message);
    //TODO: the storage update seems to be working atm.
    this.storage.set("messages", this.messages);
    this.getData();
    this.updateChart();
    this.updateBatteryStatus(this.message);
    this.scheduleNotifications(this.message);
  }

  ionViewDidLoad() {
    this.getData();
    this.updateChart();
  }

  updateChart() {
    this.barChart = new Chart(this.barCanvas.nativeElement, {

      type: 'bar',
      data: {
        labels: ["Living", "Kitchen", "Dining", "Toilet", "Bedroom"],
        datasets: [{
          label: '# Sensor Activations',
          data: this.data,
          backgroundColor: [
            'rgba(255, 99, 132, 0.2)',
            'rgba(54, 162, 235, 0.2)',
            'rgba(255, 206, 86, 0.2)',
            'rgba(75, 192, 192, 0.2)',
            'rgba(153, 102, 255, 0.2)',
            'rgba(255, 159, 64, 0.2)'
          ],
          borderColor: [
            'rgba(255,99,132,1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        scales: {
          yAxes: [{
            ticks: {
              beginAtZero: true
            }
          }]
        }
      }

    });
  }

  getData() {
    var living = 0;
    var kitchen = 0;
    var dining = 0;
    var toilet = 0;
    var bedroom = 0;

    //TODO: this can me made more efferent by just updating only recent messages not everything but it works for now.
    for (let message of this.messages) {
      var splitData = message.split(',');
      var location = splitData[1];
      var dateTime = splitData[0];
      var motionStatus = splitData[2];
      if (motionStatus == 1) {
        if (location == 'living') {
          living++;
          this.location = 'Living Room at '+ dateTime;
        } else if (location == 'kitchen') {
          kitchen++;
          this.location = 'Kitchen at '+ dateTime;
        } else if (location == 'dining') {
          dining++;
          this.location ='Dining Room at '+ dateTime;
        } else if (location == 'toilet') {
          toilet++;
          this.location = 'Toilet at '+ dateTime;
        } else if (location == 'bedroom') {
          bedroom++;
          this.location = 'Bedroom at '+ dateTime;
        }
      }
    }
    this.data.splice(0, 1, living);
    this.data.splice(1, 1, kitchen);
    this.data.splice(2, 1, dining);
    this.data.splice(3, 1, toilet);
    this.data.splice(4, 1, bedroom);
    // console.log(this.data);
  }

  updateBatteryStatus(message) {
    var splitData = message.split(',');
    var location = splitData[1];
    var batteryStatus = splitData[3];

    if (location == 'living') {
      this.storage.set("livingBattery", batteryStatus);
      this.events.publish('livingBatteryUpdate')
    } else if (location == 'kitchen') {
      this.storage.set("kitchenBattery", batteryStatus);
      this.events.publish('kitchenBatteryUpdate')
    } else if (location == 'dining') {
      this.storage.set("diningBattery", batteryStatus);
      this.events.publish('diningBatteryUpdate')
    } else if (location == 'toilet') {
      this.storage.set("toiletBattery", batteryStatus);
      this.events.publish('toiletBatteryUpdate')
    } else if (location == 'bedroom') {
      this.storage.set("bedroomBattery", batteryStatus);
      this.events.publish('bedroomBatteryUpdate')
    }
  }

  scheduleNotifications(message) {
    var splitData = message.split(',');
    var dateTime = splitData[0];

    var motionStatus = splitData[2];
    if(motionStatus == 1){
      this.dateTime = dateTime;
      this.showNotification =false;
    }else {
      if (this.dateTime == undefined) {
        this.dateTime = dateTime
      } else {
        if(this.showNotification ==false){
          // 300,000 = 5 min
          var futureTime = new Date(new Date(new Date(this.dateTime.replace(' ', 'T')).getTime() - (3600000 * 13) ).getTime() + 10000);
          //var futureTime = new Date(this.dateTime.replace(' ', 'T'));
          console.log("dateTIme "+this.dateTime);
          console.log("future date "+futureTime);

          var currentDate = new Date();
          console.log("current date "+currentDate);
          if(currentDate.getTime() >= futureTime.getTime()){
            this.showNotification = true;

              this.localNotification.schedule({
                id: 1,
                title: "Attention",
                text: "Check on the senior! Last seen "+ this.dateTime,
                data: {mydata: 'RIP Senior is dead...'},
                foreground: true
              });
          }
          }
          // var futureTime = new Date(new Date(this.dateTime).getTime() + 30000);

          // console.log(futureTime);
          // console.log(currentDate)
          // console.log(currentDate.getTime() >= futureTime.getTime())
        }
      }
    }


}
