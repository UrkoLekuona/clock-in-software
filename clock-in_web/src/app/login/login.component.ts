import { Component, OnInit } from "@angular/core";
import {
  FormControl,
  FormGroup,
  Validators,
  FormBuilder
} from "@angular/forms";
import { Router } from "@angular/router";

import { NetworkService } from "../network.service";
import { UserService } from "../user.service";
import Swal from "sweetalert2";

@Component({
  selector: "app-login",
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.css"]
})
export class LoginComponent implements OnInit {

  loginForm: FormGroup;
  alert = Swal.mixin({
    confirmButtonText: "Vale",
    allowOutsideClick: false,
    allowEscapeKey: false
  });

  constructor(
    private network: NetworkService,
    private formBuilder: FormBuilder,
    private router: Router,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.loginForm = this.formBuilder.group({
      username: new FormControl("", Validators.required),
      password: new FormControl("", Validators.required)
    });
  }

  submit(value) {
    this.network.login(value).subscribe(
      data => {
        const aux: any = data;
        console.log(aux);
        this.userService.fillFields(value.username, aux.body.token, {
          date: aux.body.date,
          type: aux.body.type
        });
        this.router.navigate(["/home"]);
      },
      error => {
        switch (error.status) {
          case 401:
            this.alert.fire({
              title: "Error",
              text: "Usuario o contraseña incorrectos",
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
        this.loginForm.controls["password"].setValue("");
      }
    );
  }
}
