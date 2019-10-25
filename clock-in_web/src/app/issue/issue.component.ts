import { Component, OnInit } from "@angular/core";
import {
  FormControl,
  FormGroup,
  Validators,
  FormBuilder
} from "@angular/forms";
import { Router } from "@angular/router";
import Swal from "sweetalert2";

import { DateHourValidator } from "../dateHourValidator";
import { NetworkService } from "../network.service";
import { UserService } from "../user.service";

@Component({
  selector: "app-issue",
  templateUrl: "./issue.component.html",
  styleUrls: ["./issue.component.css"]
})
export class IssueComponent implements OnInit {
  inDate = history.state.in;
  id = history.state.id;
  outDate = history.state.out;
  issueForm: FormGroup;
  date: { value: string } = { value: "" };
  alert = Swal.mixin({
    confirmButtonText: "Vale",
    allowOutsideClick: false,
    allowEscapeKey: false
  });

  constructor(
    private formBuilder: FormBuilder,
    private network: NetworkService,
    private router: Router,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.issueForm = this.formBuilder.group({
      text: new FormControl("", Validators.required),
      date: new FormControl(""),
      hour: new FormControl("")
    });

    const dateControl = this.issueForm.get("date");
    const hourControl = this.issueForm.get("hour");

    if (this.inDate !== undefined || this.outDate !== undefined) {
      dateControl.setValidators([
        Validators.required,
        DateHourValidator.dateValidator
      ]);
      hourControl.setValidators([
        Validators.required,
        DateHourValidator.hourValidator
      ]);
    }
  }

  submit(value) {
    this.network.issue(value).subscribe(
      data => {
        this.router.navigate(["/home"]);
      },
      error => {
        switch (error.status) {
          case 401:
            this.alert
              .fire({
                title: "Error",
                text: "Acceso denegado. Token no válido",
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
}
