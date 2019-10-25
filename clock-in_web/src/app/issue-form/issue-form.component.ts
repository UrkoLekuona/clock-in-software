import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import {
  FormControl,
  FormGroup,
  Validators,
  FormBuilder
} from "@angular/forms";

import { NetworkService } from "../network.service";
import { UserService } from "../user.service";
import { DateHourValidator } from "../dateHourValidator";

@Component({
  selector: "app-issue-form",
  templateUrl: "./issue-form.component.html",
  styleUrls: ["./issue-form.component.css"]
})
export class IssueFormComponent implements OnInit {
  issueForm: FormGroup;
  text: string;
  waiting: boolean = false;
  date: { value: string } = { value: 'a' };

  constructor(
    private formBuilder: FormBuilder,
    private network: NetworkService,
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit() {
    this.issueForm = this.formBuilder.group({
      text: new FormControl('', Validators.required),
      date: new FormControl('', Validators.compose([Validators.required, DateHourValidator.dateValidator]))
    });
  }

  send(value) {
    this.waiting = true;
    console.log(value);
    this.network.issueform(value).subscribe(
      res => {
        alert("Incidencia creada correctamente.");
        this.router.navigate(["/home"]);
        this.waiting = false;
      },
      err => {
        console.log(err);
        switch (err.status) {
          case 400:
            alert("Error: El texto tiene que tener entre 0 y 2550 caracteres.");
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
        this.waiting = false;
      }
    );
    //this.waiting = false;
  }
}
