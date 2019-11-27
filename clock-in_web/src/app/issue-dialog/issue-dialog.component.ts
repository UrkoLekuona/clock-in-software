import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material";
import {
  FormGroup,
  FormBuilder,
  FormControl,
  Validators
} from "@angular/forms";
import { Inject, OnInit, Component } from "@angular/core";
import { DateHourValidator } from "../dateHourValidator";
import { NetworkService } from "../network.service";

import Swal from "sweetalert2";
import { UserService } from "../user.service";
import { Router } from "@angular/router";
import { ErrorService } from "../error.service";

export interface Clock {
  id: number;
  inDate: string;
  outDate: string;
}

@Component({
  selector: "issue-dialog",
  templateUrl: "./issue-dialog.component.html",
  styleUrls: ["./issue-dialog.component.css"]
})
export class IssueDialogComponent implements OnInit {
  issueForm: FormGroup;
  clock: Clock;
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
    private dialogRef: MatDialogRef<IssueDialogComponent>,
    private errorService: ErrorService,
    @Inject(MAT_DIALOG_DATA) data
  ) {
    this.clock = data;
  }

  ngOnInit() {
    this.issueForm = this.formBuilder.group({
      id: new FormControl(this.clock.id, Validators.required),
      text: new FormControl("", Validators.required),
      date: new FormControl(
        "",
        Validators.compose([
          Validators.required,
          DateHourValidator.dateValidator
        ])
      ),
      rInDate: new FormControl(this.clock.inDate, Validators.required),
      nInDate: new FormControl(
        "",
        Validators.compose([
          Validators.required,
          DateHourValidator.dateHourValidator
        ])
      ),
      rOutDate: new FormControl(this.clock.outDate, Validators.required),
      nOutDate: new FormControl(
        "",
        Validators.compose([
          Validators.required,
          DateHourValidator.dateHourValidator
        ])
      )
    });
    this.issueForm.controls["rInDate"].disable();
    this.issueForm.controls["rOutDate"].disable();
  }

  save() {
    this.network.issue(this.issueForm.value).subscribe(
      res => {
        this.dialogRef.close("ok");
      },
      error => {
        console.log(error);
        this.errorService
          .error(error, {
            400: "Los campos introducidos no son válidos.",
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
    );
  }

  close() {
    this.dialogRef.close();
  }
}
