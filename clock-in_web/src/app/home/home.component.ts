import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import Swal from "sweetalert2";

import { NetworkService } from "../network.service";
import { UserService } from "../user.service";

@Component({
  selector: "app-home",
  templateUrl: "./home.component.html",
  styleUrls: ["./home.component.css"]
})
export class HomeComponent implements OnInit {
  username = this.userService.username;
  date = new Date(this.userService.lastLogin.date);
  type = this.userService.lastLogin.type;
  admin = this.userService.lastLogin.admin;
  alert = Swal.mixin({
    confirmButtonText: "Vale",
    allowOutsideClick: false,
    allowEscapeKey: false
  });

  constructor(
    private network: NetworkService,
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit() {}

  clock(value) {
    console.log(value);
    this.network.clock(value).subscribe(
      data => {
        console.log(data);
        this.date = new Date();
        this.type = value;
        this.userService.fillFields(this.username, this.userService.token, {
          date: this.date.toString(),
          type: value,
          admin: this.admin
        });
      },
      error => {
        console.log(error);
        switch (error.status) {
          case 400:
            if (error.error.status.includes("Bad request: unpaired outdate")) {
              this.alert.fire({
                title: "¿Abrir incidencia?",
                text: "Estás intentando salir sin haber marcado antes una hora de entrada. Si no has podido o se te ha olvidado, ¿quieres abrir una incidencia?",
                type: "question",
                showCancelButton: true,
                cancelButtonText: 'Cancelar'
              }).then(res => {
                if (res.value) {
                  this.lastClock("out");
                }
              });
            } else if (error.error.status.includes("Bad request: unpaired indate")) {
              this.alert.fire({
                title: "¿Abrir incidencia?",
                text: "Estás intentado entrar, pero la última vez no marcaste la hora de salida. Si no pudiste o se te olvidó, ¿quieres abrir una incidencia?",
                type: "question",
                showCancelButton: true,
                cancelButtonText: 'Cancelar'
              }).then(res => {
                if (res.value) {
                  this.lastClock("in");
                }
              });
            } else {
              this.alert.fire({
                title: "Error",
                text: "Petición no válida.",
                type: "error"
              });
            }
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
              text: "Fallo del servidor. Contacte con un administrador.",
              type: "error"
            });
            break;
          default:
            this.alert.fire({
              title: "Error",
              text: "Fallo desconocido. Contacte con un administrador.",
              type: "error"
            });
        }
      }
    );
  }

  lastClock(value) {
    this.router.navigate(["/issueForm"]);
    /*this.network.lastclock(value).subscribe(res => {
      const aux: any = res;
      console.log(aux);
      this.router.navigate(["/issue"], { state: aux.body });
    },
    err => {
      console.log(err);
      switch (err.status) {
        case 400:
          this.alert.fire({
            title: "Error",
            text: "Petición no válida.",
            type: "error"
          });
          break;
        case 500:
          this.alert.fire({
            title: "Error",
            text: "Fallo del servidor. Contacte con un administrador.",
            type: "error"
          });
          break;
        default:
          this.alert.fire({
            title: "Error",
            text: "Fallo desconocido. Contacte con un administrador.",
            type: "error"
          });
      }
    });*/
  }

  isValidDate(d) {
    return d instanceof Date && !isNaN(d.getTime());
  }

  logout() {
    this.alert.fire({
      title: "¿Cerrar sesión?",
      type: "question",
      showCancelButton: true,
      cancelButtonText: 'Cancelar'
    }).then(res => {
      if (res.value) {
        this.userService.logout();
        this.router.navigate(["/login"]);
      }
    });
  }

  issue() {
    //this.router.navigate(["/issue"]);
    this.router.navigate(["/issueForm"]);
  }

  adminHome() {
    this.router.navigate(["/adminHome"]);
  }
}
