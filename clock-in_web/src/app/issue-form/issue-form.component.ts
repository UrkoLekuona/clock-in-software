import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import {
  FormControl,
  FormGroup,
  Validators,
  FormBuilder
} from "@angular/forms";
import Swal from "sweetalert2";

import { NetworkService } from "../network.service";
import { UserService } from "../user.service";
import { DateHourValidator } from "../dateHourValidator";
import { ErrorService } from "../error.service";

@Component({
  selector: "app-issue-form",
  templateUrl: "./issue-form.component.html",
  styleUrls: ["./issue-form.component.css"]
})
export class IssueFormComponent implements OnInit {
  issueForm: FormGroup;
  text: string;
  waiting: boolean = false;
  date: { value: string } = { value: "" };
  alert = Swal.mixin({
    confirmButtonText: "Vale",
    allowOutsideClick: false,
    allowEscapeKey: false
  });

  constructor(
    private formBuilder: FormBuilder,
    private network: NetworkService,
    private userService: UserService,
    private router: Router,
    private errorService: ErrorService
  ) {}

  ngOnInit() {
    this.issueForm = this.formBuilder.group({
      text: new FormControl("", Validators.required),
      date: new FormControl(
        "",
        Validators.compose([
          Validators.required,
          DateHourValidator.dateValidator
        ])
      )
    });
  }

  send(value) {
    this.waiting = true;
    console.log(value);
    this.network.issueform(value).subscribe(
      res => {
        this.alert
          .fire({
            title: "Éxito",
            text: "Incidencia creada correctamente",
            type: "success"
          })
          .then(result => {
            this.router.navigate(["/home"]);
            this.waiting = false;
          });
      },
      error => {
        console.log(error);
        this.errorService
          .error(error, {
            400: "El texto tiene que tener entre 0 y 2550 caracteres y la fecha tiene que ser DD/MM/YYYY.",
            401: "Acceso denegado. La sesión ha expirado.",
            500: "Fallo del servidor. Contacte con un administrador."
          })
          .then(res => {
            if (error.status == 401) {
              this.userService.logout();
              this.router.navigate(["/login"]);
            }
          });
        this.waiting = false;
      }
    );
  }
}
