import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import Swal from "sweetalert2";

import { NetworkService } from "../network.service";
import { UserService } from "../user.service";
import { ErrorService } from "../error.service";

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
  disableButtons = false;
  alert = Swal.mixin({
    confirmButtonText: "Vale",
    allowOutsideClick: false,
    allowEscapeKey: false
  });

  constructor(
    private network: NetworkService,
    private userService: UserService,
    private router: Router,
    private errorService: ErrorService
  ) {}

  ngOnInit() {}

  clock(value) {
    console.log(value);
    this.disableButtons = true;
    this.network.clock(value).subscribe(
      data => {
        console.log(data);
        setTimeout(() => {
          this.disableButtons = false;
        }, 1000);
        this.date = new Date();
        this.type = value;
        this.userService.fillFields(this.username, this.userService.token, {
          date: this.date.toString(),
          type: value,
          admin: this.admin
        });
        Swal.fire({
          title: "Has fichado correctamente",
          type: "success",
          toast: true,
          position: "bottom",
          showConfirmButton: false,
          timer: 3000
        });
      },
      error => {
        console.log(error);
        setTimeout(() => {
          this.disableButtons = false;
        }, 1000);
        if (
          error.status == 400 &&
          error.error.status.includes("Bad request: unpaired outdate")
        ) {
          this.alert
            .fire({
              title: "¿Abrir incidencia?",
              text:
                "Estás intentando salir sin haber marcado antes una hora de entrada. Si no has podido o se te ha olvidado, ¿quieres abrir una incidencia?",
              type: "question",
              showCancelButton: true,
              cancelButtonText: "Cancelar"
            })
            .then(res => {
              if (res.value) {
                this.lastClock("out");
              }
            });
        } else if (
          error.status == 400 &&
          error.error.status.includes("Bad request: unpaired indate")
        ) {
          this.alert
            .fire({
              title: "¿Abrir incidencia?",
              text:
                "Estás intentado entrar, pero la última vez no marcaste la hora de salida. Si no pudiste o se te olvidó, ¿quieres abrir una incidencia?",
              type: "question",
              showCancelButton: true,
              cancelButtonText: "Cancelar"
            })
            .then(res => {
              if (res.value) {
                this.lastClock("in");
              }
            });
        } else {
          this.errorService
            .error(error, {
              400: "Petición no válida.",
              401: "Acceso denegado. La sesión ha expirado.",
              500: "Fallo del servidor. Contacte con un administrador."
            })
            .then(res => {
              if (error.status == 401) {
                this.userService.logout();
                this.router.navigate(["/login"]);
              }
            });
        }
      }
    );
  }

  lastClock(value) {
    this.router.navigate(["/issueForm"]);
  }

  isValidDate(d) {
    return d instanceof Date && !isNaN(d.getTime());
  }

  logout() {
    this.alert
      .fire({
        title: "¿Cerrar sesión?",
        type: "question",
        showCancelButton: true,
        cancelButtonText: "Cancelar"
      })
      .then(res => {
        if (res.value) {
          this.userService.logout();
          this.router.navigate(["/login"]);
        }
      });
  }

  issue() {
    this.router.navigate(["/issueForm"]);
  }

  adminHome() {
    this.router.navigate(["/adminHome"]);
  }

  clockHistory() {
    this.router.navigate(["/clockHistory"]);
  }
}
