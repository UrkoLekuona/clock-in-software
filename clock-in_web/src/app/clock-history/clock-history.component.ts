import { Component, OnInit, ViewChild, ElementRef } from "@angular/core";
import {
  FormControl,
  FormGroup,
  Validators,
  FormBuilder
} from "@angular/forms";
import {
  MatTableDataSource,
  MatPaginator,
  MatSort
} from "@angular/material";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import * as moment from "moment";
import { Address4, Address6 } from "ip-address";

import { NetworkService } from "../network.service";
import { DateHourValidator } from "../dateHourValidator";
import { UserService } from "../user.service";
import { Router } from "@angular/router";
import { ErrorService } from "../error.service";

export interface Clock {
  id: number;
  inDate: string;
  inIp: string;
  outDate: string;
  outIp: string;
  todayHours?: string;
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

export interface ManualClock {
  id: number;
  text: string;
  inDate: string;
  outDate: string;
}

export interface User {
  username: string;
  displayName?: string;
  clocks?: Clock[];
  totalHour?: number;
  issues?: Issue[];
  diffHour?: number;
  totalHourAfterDiff?: number;
  manualClocks?: ManualClock[];
  diffHourManual?: number;
  totalHourAfterManual?: number;
}

@Component({
  selector: 'app-clock-history',
  templateUrl: './clock-history.component.html',
  styleUrls: ['./clock-history.component.css']
})
export class ClockHistoryComponent implements OnInit {
  selectedUser: User = undefined;
  loading: boolean = false;
  clockDatesForm: FormGroup;
  tooltip_position = "after";
  dailyArray: {} = {};
  alert = Swal.mixin({
    confirmButtonText: "Vale",
    allowOutsideClick: false,
    allowEscapeKey: false
  });
  paginator: MatPaginator;
  sort: MatSort;

  @ViewChild("exporter", { static: false }) exporter: any;
  @ViewChild("clockTable", { static: false }) clockTable: ElementRef;
  @ViewChild("issueTable", { static: false }) issueTable: ElementRef;
  @ViewChild("manualTable", { static: false }) manualTable: ElementRef;
  @ViewChild(MatPaginator, { static: false }) set matPaginator(
    mp: MatPaginator
  ) {
    this.paginator = mp;
    if (this.paginator && this.dataSourceClock)
      this.dataSourceClock.paginator = this.paginator;
  }
  @ViewChild(MatSort, { static: false }) set matSort(ms: MatSort) {
    this.sort = ms;
    if (this.sort && this.dataSourceClock)
      this.dataSourceClock.sort = this.sort;
  }

  public displayedColumnsClock = [
    "id",
    "inDate",
    "outDate",
    "todayHours"
  ];
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
  public displayedColumnsManual = ["id", "text", "inDate", "outDate"];
  public dataSourceManual: MatTableDataSource<ManualClock>;

  constructor(
    private network: NetworkService,
    private formBuilder: FormBuilder,
    private userService: UserService,
    private router: Router,
    private errorService: ErrorService
  ) { }

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
    this.selectedUser = { username: this.userService.username };
  }

  clocksBetweenDates(value) {
    const invalidDates = DateHourValidator.dateBeforeValidator(
      this.clockDatesForm.get("clock_since"),
      this.clockDatesForm.get("clock_until")
    );
    if (this.clockDatesForm.valid && !invalidDates) {
      this.loading = true;
      this.dailyArray = {};
      value["user"] = this.selectedUser.username;
      this.network.clocksBetweenDates(value).subscribe(
        data => {
          const aux: any = data;
          this.selectedUser = {
            username: this.selectedUser.username,
            clocks: aux.body.clocks,
            issues: aux.body.issues,
            manualClocks: aux.body.manualClocks
          };
          this.dataSourceClock = new MatTableDataSource<Clock>(
            this.selectedUser.clocks
          );
          this.dataSourceIssue = new MatTableDataSource<Issue>(
            this.selectedUser.issues
          );
          this.dataSourceManual = new MatTableDataSource<ManualClock>(
            this.selectedUser.manualClocks
          );
          let totalHour = 0;
          this.selectedUser.clocks.forEach(clock => {
            try {
              let ip1 = new Address6(clock.inIp);
              clock.inIp = ip1.to4().address;
              let ip2 = new Address6(clock.outIp);
              clock.outIp = ip2.to4().address;
            } catch { }
            if (
              !clock.inDate.includes("Invalid") &&
              !clock.outDate.includes("Invalid")
            ) {
              let d1 = moment(clock.inDate, "DD/MM/YYYY HH:mm:ss", true);
              let d2 = moment(clock.outDate, "DD/MM/YYYY HH:mm:ss", true);
              totalHour += d2.diff(d1, "minutes");
              this.insertIntoDailyArray(clock);
            }
          });
          this.selectedUser.clocks.forEach(clock => {
            let d1 = moment(clock.inDate, "DD/MM/YYYY HH:mm:ss", true);
            clock.todayHours = this.timeConvert(
              this.dailyArray[d1.format("DD/MM/YYYY")]
            );
          });
          let diffHour = 0;
          this.selectedUser.issues.forEach(issue => {
            diffHour += issue.diffInDate + issue.diffOutDate;
          });
          let manualHour = 0;
          this.selectedUser.manualClocks.forEach(manualClock => {
            let d1 = moment(manualClock.inDate, "DD/MM/YYYY HH:mm:ss", true);
            let d2 = moment(manualClock.outDate, "DD/MM/YYYY HH:mm:ss", true);
            manualHour += d2.diff(d1, "minutes");
          });
          this.selectedUser.totalHour = totalHour;
          this.selectedUser.diffHour = diffHour;
          this.selectedUser.totalHourAfterDiff = totalHour + diffHour;
          this.selectedUser.diffHourManual = manualHour;
          this.selectedUser.totalHourAfterManual =
            this.selectedUser.totalHourAfterDiff + manualHour;
          this.dataSourceClock.paginator = this.paginator;
        },
        error => {
          console.log(error);
          this.errorService
            .error(error, {
              400: "Las fechas elegidas no son válidas",
              401: "Acceso denegado. La sesión ha expirado.",
              500: "Fallo del servidor. Contacte con un administrador."
            })
            .then(res => {
              if (error.status == 401) {
                this.userService.logout();
                this.router.navigate(["/login"]);
              }
            });
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
      if (this.manualTable) {
        const ws3: XLSX.WorkSheet = XLSX.utils.table_to_sheet(
          this.manualTable.nativeElement,
          { raw: true }
        );
        XLSX.utils.book_append_sheet(wb, ws3, "Fichajes Manuales");
      }
      let iD = moment(this.clockDatesForm.get("clock_since").value).format(
        "DD-MM-YYYY"
      );
      let oD = moment(this.clockDatesForm.get("clock_until").value).format(
        "DD-MM-YYYY"
      );
      XLSX.writeFile(
        wb,
        "Fichajes_" +
        iD +
        "_" +
        oD +
        ".xlsx"
      );
    } else {
      this.alert.fire({
        title: "Error",
        text: "La tabla está vacía",
        type: "error"
      });
    }
  }

  pad(num, size) {
    var s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
  }

  timeConvert(value) {
    let num = value;
    let hours = num / 60;
    let rhours = hours >= 0 ? Math.floor(hours) : Math.ceil(hours);
    let minutes = num % 60;
    let rminutes = Math.round(minutes);
    return this.pad(rhours, 2) + " horas y " + this.pad(rminutes, 2) + " minutos";
  }

  insertIntoDailyArray(clock) {
    let day = moment(clock.inDate, "DD/MM/YYYY HH:mm:ss", true).format(
      "DD/MM/YYYY"
    );
    let d1 = moment(clock.inDate, "DD/MM/YYYY HH:mm:ss", true);
    let d2 = moment(clock.outDate, "DD/MM/YYYY HH:mm:ss", true);
    if (this.dailyArray[day]) {
      this.dailyArray[day] += d2.diff(d1, "minutes");
    } else {
      this.dailyArray[day] = d2.diff(d1, "minutes");
    }
  }
}
