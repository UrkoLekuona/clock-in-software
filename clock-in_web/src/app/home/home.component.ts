import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";

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
        this.userService.fillFields(this.username, this.userService.token, {
          date: this.date.toString()
        });
      },
      error => {
        console.log(error);
        switch (error.status) {
          case 400:
            if (error.error.status === 'Bad request: unpaired outdate') {
              if(confirm("Estás intentando salir sin haber marcado antes una hora de entrada. Si no has podido o se te ha olvidado, ¿quieres abrir una incidencia?")) {
                this.lastClock('out');
              }
            } else if (error.error.status === 'Bad request: unpaired indate') {
              if(confirm("Estás intentado entrar, pero la última vez no marcaste la hora de salida. Si no pudiste o se te olvidó, ¿quieres abrir una incidencia?")) {
                this.lastClock('in');
              }
            } else {
              alert("Error: Petición no válida.");
            }
            break;
          case 401:
            alert("Error: Acceso denegado. Token no válido.");
            this.userService.logout();
            this.router.navigate(["/login"]);
            break;
          case 500:
            alert("Error: Fallo del servidor. Contacte con un administrador.");
            break;
          default:
            alert("Error: Fallo desconocido. Contacte con un administrador.");
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
          alert("Error: Petición no válida.");
          break;
        case 500:
          alert("Error: Error del servidor. Contacte con un administrado.");
          break;
        default:
          alert("Error: Fallo desconocido. Contacte con un administrador.");
      }
    });*/
  }

  isValidDate(d) {
    return d instanceof Date && !isNaN(d.getTime());
  }

  logout(){
    if(confirm("¿Cerrar sesión?")) {
      this.userService.logout();
      this.router.navigate(["/login"]);
    }
  }

  issue() {
    //this.router.navigate(["/issue"]);
    this.router.navigate(["/issueForm"]);
  }
}
