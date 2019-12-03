import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material";
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

@Component({
  selector: "app-admin-clock-dialog",
  templateUrl: "./admin-clock-dialog.component.html",
  styleUrls: ["./admin-clock-dialog.component.css"]
})
export class AdminClockDialogComponent implements OnInit {
  clockForm: FormGroup;
  alert = Swal.mixin({
    confirmButtonText: "Vale",
    allowOutsideClick: false,
    allowEscapeKey: false
  });
  user: string;

  constructor(
    private formBuilder: FormBuilder,
    private network: NetworkService,
    private userService: UserService,
    private router: Router,
    private dialogRef: MatDialogRef<AdminClockDialogComponent>,
    private errorService: ErrorService,
    @Inject(MAT_DIALOG_DATA) data
  ) {
    this.user = data;
  }

  ngOnInit() {
    this.clockForm = this.formBuilder.group({
      user: new FormControl(this.user, Validators.required),
      text: new FormControl("", Validators.required),
      nInDate: new FormControl(
        "",
        Validators.compose([
          Validators.required,
          DateHourValidator.dateHourValidator
        ])
      ),
      nOutDate: new FormControl(
        "",
        Validators.compose([
          Validators.required,
          DateHourValidator.dateHourValidator
        ])
      )
    });
  }

  save() {
    this.network.adminClock(this.clockForm.value).subscribe(
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
