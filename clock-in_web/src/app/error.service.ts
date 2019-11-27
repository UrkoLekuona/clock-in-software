import { Injectable } from '@angular/core';

import Swal from "sweetalert2";

@Injectable({
  providedIn: 'root'
})
export class ErrorService {
  alert = Swal.mixin({
    confirmButtonText: "Vale",
    allowOutsideClick: false,
    allowEscapeKey: false,
    title: "Error",
    type: "error"
  });

  constructor() { }

  error(error, msgs: { 400?: string, 401?: string, 500?: string}){
    if (error.status && msgs[error.status]) {
      return this.alert.fire({ text: msgs[error.status] });
    } else {
      return this.alert.fire({ text: "Fallo desconocido. Contacte con un administrador." });
    }
  }
}
