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
          date: aux.body.date
        });
        this.router.navigate(["/home"]);
      },
      error => {
        switch (error.status) {
          case 401:
            alert("Error: Usuario o contraseña incorrectos.");
            break;
          case 500:
            alert("Error: Fallo del servidor. Contacte con un administrador.");
            break;
          default:
            alert("Error: Fallo desconocido. Contacte con un administrador.");
        }
        this.loginForm.controls["password"].setValue("");
      }
    );
  }
}
