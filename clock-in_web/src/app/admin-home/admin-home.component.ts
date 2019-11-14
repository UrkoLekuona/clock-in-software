import { Component, OnInit, ViewChild, ElementRef } from "@angular/core";
import {
  FormControl,
  FormGroup,
  Validators,
  FormBuilder
} from "@angular/forms";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import * as moment from "moment";

import { NetworkService } from "../network.service";
import { DateHourValidator } from "../dateHourValidator";
import { UserService } from "../user.service";
import { Router } from "@angular/router";
import { MatTableDataSource, MatTable } from "@angular/material";

export interface Clock {
  id: number;
  inDate: string;
  inIp: string;
  outDate: string;
  outIp: string;
}

export interface Issue {
  id: number;
  date: string;
  text: string;
  rInDate: string;
  nInDate: string;
  diffInDate: number;
  rOutDate: string;
  nOutDate: string;
  diffOutDate: number;
}

export interface User {
  username: string;
  displayName?: string;
  clocks?: Clock[];
  totalHour?: number;
  issues?: Issue[];
  diffHour?: number;
  totalHourAfterDiff?: number;
}

@Component({
  selector: "app-admin-home",
  templateUrl: "./admin-home.component.html",
  styleUrls: ["./admin-home.component.css"]
})
export class AdminHomeComponent implements OnInit {
  users: User[] = [];
  selectedUser: User = undefined;
  loading: boolean = false;
  clockDatesForm: FormGroup;
  alert = Swal.mixin({
    confirmButtonText: "Vale",
    allowOutsideClick: false,
    allowEscapeKey: false
  });
  @ViewChild("exporter", { static: false }) exporter: any;
  @ViewChild("clockTable", { static: false }) clockTable: ElementRef;
  @ViewChild("issueTable", { static: false }) issueTable: ElementRef;

  public displayedColumnsClock = ["id", "inDate", "inIp", "outDate", "outIp"];
  public dataSourceClock: MatTableDataSource<Clock>;
  public displayedColumnsIssue = [
    "id",
    "date",
    "text",
    "rInDate",
    "nInDate",
    "diffInDate",
    "rOutDate",
    "nOutDate",
    "diffOutDate"
  ];
  public dataSourceIssue: MatTableDataSource<Issue>;

  constructor(
    private network: NetworkService,
    private formBuilder: FormBuilder,
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit() {
    this.clockDatesForm = this.formBuilder.group({
      clock_since: new FormControl(
        "",
        Validators.compose([
          Validators.required,
          DateHourValidator.dateValidator
        ])
      ),
      clock_until: new FormControl(
        "",
        Validators.compose([
          Validators.required,
          DateHourValidator.dateValidator
        ])
      )
    });
    this.loading = true;
    this.network.allUsers().subscribe(
      data => {
        let aux: any = data;
        const users: User[] = aux.body.users;
        this.users = users;
        console.log(this.users);
      },
      err => {
        console.log(err);
        switch (err.status) {
          case 401:
            this.alert
              .fire({
                title: "Error",
                text: "Acceso denegado. La sesión ha expirado.",
                type: "error"
              })
              .then(res => {
                this.userService.logout();
                this.router.navigate(["/login"]);
              });
            break;
          case 500:
            this.alert.fire({
              title: "Error",
              text: "Fallo del servidor. Contacte con un administrador",
              type: "error"
            });
            break;
          default:
            this.alert.fire({
              title: "Error",
              text: "Fallo desconocido. Contacte con un administrador",
              type: "error"
            });
        }
        this.loading = false;
      },
      () => {
        this.loading = false;
      }
    );
  }

  loadUser(user) {
    this.selectedUser = this.users.find(x => { return x.username === user; });
    this.clockDatesForm.get("clock_since").setErrors({ invalid: true });
    this.clockDatesForm.reset();
  }

  clocksBetweenDates(value) {
    const invalidDates = DateHourValidator.dateBeforeValidator(
      this.clockDatesForm.get("clock_since"),
      this.clockDatesForm.get("clock_until")
    );
    if (this.clockDatesForm.valid && !invalidDates) {
      this.loading = true;
      value["user"] = this.selectedUser.username;
      this.network.clocksBetweenDates(value).subscribe(
        data => {
          const aux: any = data;
          this.selectedUser = {
            username: this.selectedUser.username,
            displayName: this.selectedUser.displayName,
            clocks: aux.body.clocks,
            issues: aux.body.issues
          };
          this.dataSourceClock = new MatTableDataSource<Clock>(
            this.selectedUser.clocks
          );
          this.dataSourceIssue = new MatTableDataSource<Issue>(
            this.selectedUser.issues
          );
          let totalHour = 0;
          this.selectedUser.clocks.forEach(clock => {
            if (
              !clock.inDate.includes("Invalid") &&
              !clock.outDate.includes("Invalid")
            ) {
              let d1 = moment(clock.inDate, "DD/MM/YYYY HH:mm:ss", true);
              let d2 = moment(clock.outDate, "DD/MM/YYYY HH:mm:ss", true);
              totalHour += d2.diff(d1, "minutes");
            }
          });
          let diffHour = 0;
          this.selectedUser.issues.forEach(issue => {
            diffHour += issue.diffInDate + issue.diffOutDate;
          }); 
          this.selectedUser.totalHour = totalHour;
          this.selectedUser.diffHour = diffHour;
          this.selectedUser.totalHourAfterDiff = totalHour + diffHour;
          console.log(aux.body);
          console.log(this.selectedUser.totalHour);
        },
        err => {
          console.log(err);
          switch (err.status) {
            case 400:
              this.alert.fire({
                title: "Error",
                text: "Las fechas elegidas no son válidas",
                type: "error"
              });
              break;
            case 401:
              this.alert
                .fire({
                  title: "Error",
                  text: "Acceso denegado. La sesión ha expirado.",
                  type: "error"
                })
                .then(res => {
                  this.userService.logout();
                  this.router.navigate(["/login"]);
                });
              break;
            case 500:
              this.alert.fire({
                title: "Error",
                text: "Fallo del servidor. Contacte con un administrador",
                type: "error"
              });
              break;
            default:
              this.alert.fire({
                title: "Error",
                text: "Fallo desconocido. Contacte con un administrador",
                type: "error"
              });
          }
          this.loading = false;
        },
        () => {
          this.loading = false;
        }
      );
    }
  }

  saveAsExcel() {
    const invalidDates = DateHourValidator.dateBeforeValidator(
      this.clockDatesForm.get("clock_since"),
      this.clockDatesForm.get("clock_until")
    );
    if (this.clockTable && this.clockDatesForm.valid && !invalidDates) {
      const ws: XLSX.WorkSheet = XLSX.utils.table_to_sheet(
        this.clockTable.nativeElement,
        { raw: true }
      );
      const wb: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Fichajes");
      if (this.issueTable) {
        const ws2: XLSX.WorkSheet = XLSX.utils.table_to_sheet(
          this.issueTable.nativeElement,
          { raw: true }
        );
        XLSX.utils.book_append_sheet(wb, ws2, "Incidencias");
      }
      let iD = moment(this.clockDatesForm.get('clock_since').value).format('DD-MM-YYYY');
      let oD = moment(this.clockDatesForm.get('clock_until').value).format('DD-MM-YYYY');
      XLSX.writeFile(wb, "Fichajes_" + this.selectedUser.displayName.replace(/\s/g, "") + "_" + iD + "_" + oD + ".xlsx");
    } else {
      this.alert.fire({
        title: "Error",
        text: "La tabla está vacía",
        type: "error"
      });
    }
  }

  timeConvert(value) {
    let num = value;
    let hours = num / 60;
    let rhours = (hours >= 0) ? Math.floor(hours) : Math.ceil(hours);
    let minutes = num % 60;
    let rminutes = Math.round(minutes);
    return (
      rhours + " horas y " + rminutes + " minutos"
    );
  }
}
