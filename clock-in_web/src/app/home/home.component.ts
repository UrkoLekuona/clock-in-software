import { Component, OnInit } from '@angular/core';

import { NetworkService } from '../network.service';
import { UserService } from '../user.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  username = this.userService.username;

  constructor(private network: NetworkService, private userService: UserService) { }

  ngOnInit() {
  }

  clock(value){
    console.log(value);
    const response = this.network.clock(value).subscribe( data => {
      console.log(data);
    }, error => {
      switch (error.status) {
        case 403:
          alert('Error: Acceso denegado. Token no válido.');
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
