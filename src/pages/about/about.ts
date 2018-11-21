import { Component, Input } from '@angular/core';
import { NavController, Events } from 'ionic-angular';
import {Storage} from "@ionic/storage"
import * as c3 from "c3";


@Component({
  selector: 'page-about',
  templateUrl: 'about.html'
})
export class AboutPage {
  private livingSensor: number  =0;
  private kitchenSensor: number =0;
  private diningSensor: number =0;
  private toiletSensor: number =0;
  private bedroomSensor: number =0;


  constructor(public navCtrl: NavController, private storage: Storage, public events: Events) {
    this.updateBatteryStatus();
  }
  ionViewDidLoad() {
    this.updateBatteryStatus();
  }

  updateBatteryStatus(){
    this.events.subscribe('livingBatteryUpdate', () => {
      this.storage.get('livingBattery').then((val) => {
        this.livingSensor = Number(val);
        this.updateChart('livingSensor', this.livingSensor, "Living Room");
      });
    });
    this.events.subscribe('kitchenBatteryUpdate', () => {
      this.storage.get('kitchenBattery').then((val) => {
        this.kitchenSensor = Number(val);
        this.updateChart('kitchenSensor', this.kitchenSensor,"Kitchen" );
      });
    });
    this.events.subscribe('diningBatteryUpdate', () => {
      this.storage.get('diningBattery').then((val) => {
        this.diningSensor = Number(val);
        this.updateChart('diningSensor', this.diningSensor, "Dining Room");
      });
    });
    this.events.subscribe('toiletBatteryUpdate', () => {
      this.storage.get('toiletBattery').then((val) => {
        this.toiletSensor = Number(val);
        this.updateChart('toiletSensor', this.toiletSensor, "Toilet");
      });
    });
    this.events.subscribe('bedroomBatteryUpdate', () => {
      this.storage.get('bedroomBattery').then((val) => {
        this.bedroomSensor = Number(val);
        this.updateChart('bedroomSensor', this.bedroomSensor, "Bedroom");
      });
    });
  }

  updateChart(binding, data, name){
    var chart = c3.generate({
      bindto: '#'+binding,
      data: {
        columns: [
          [name, data]
        ],
        type: 'gauge',
      },
      gauge: {
      },
      color: {
        pattern: ['#FF0000', '#F97600', '#F6C600', '#60B044'], // the three color levels for the percentage values.
        threshold: {
          values: [30, 60, 90, 100]
        }
      },
      size: {
        height: 140
      }
    });
  }

}
