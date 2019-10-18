import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { NetworkService } from '../network.service';
import { UserService } from '../user.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  title = 'Fichajes DIPC';
  username = this.userService.username;
  date = new Date(this.userService.lastLogin.date);
  type = this.userService.lastLogin.type;

  constructor(private network: NetworkService, private userService: UserService, private router: Router) { }

  ngOnInit() {
  }

  clock(value){
    console.log(value);
    const response = this.network.clock(value).subscribe( data => {
      console.log(data);
      this.date = new Date();
      this.userService.fillFields(this.username, this.userService.token, { date: this.date.toString(), type: value});
      this.type = value;
    }, error => {
      console.log(error);
      switch (error.status) {
        case 400:
          alert('Error: Petición no válida.');
          break;
        case 401:
          alert('Error: Acceso denegado. Token no válido.');
          this.userService.logout();
          this.router.navigate(["/login"]);
          break;
        case 500:
          alert('Error: Fallo del servidor. Contacte con un administrador.');
          break;
        default:
          alert('Error: Fallo desconocido. Contacte con un administrador.')
      }
    });
  }

}
