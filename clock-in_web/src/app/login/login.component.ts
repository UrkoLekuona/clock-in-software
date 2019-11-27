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
import * as jwt_decode from "jwt-decode";
import { ErrorService } from "../error.service";

@Component({
  selector: "app-login",
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.css"]
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;

  constructor(
    private network: NetworkService,
    private formBuilder: FormBuilder,
    private router: Router,
    private userService: UserService,
    private errorService: ErrorService
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
        let admin = false;
        if (jwt_decode(aux.body.token).admin == true) {
          admin = true;
        }
        this.userService.fillFields(value.username, aux.body.token, {
          date: aux.body.date,
          type: aux.body.type,
          admin: admin
        });
        this.router.navigate(["/home"]);
      },
      error => {
        this.errorService.error(error, {
          401: "Usuario o contraseña incorrectos",
          500: "Fallo del servidor. Contacte con un administrador."
        });
        this.loginForm.controls["password"].setValue("");
      }
    );
  }
}
