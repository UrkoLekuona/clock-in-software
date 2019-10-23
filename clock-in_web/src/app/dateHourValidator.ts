import { AbstractControl } from '@angular/forms';
import * as moment from 'moment';

export class DateHourValidator {
  static dateValidator(AC: AbstractControl) {
    if (AC && AC.value && !moment(AC.value, 'DD/MM/YYYY',true).isValid()) {
      return {'dateValidator': true};
    }
    return null;
  }

  static hourValidator(AC: AbstractControl) {
    if (AC && AC.value && !moment(AC.value, 'HH:mm',true).isValid()) {
      return {'hourValidator': true};
    }
    return null;
  }
}