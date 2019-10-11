import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroupDirective, FormGroup, NgForm, Validators, FormBuilder } from '@angular/forms';

import { NetworkService } from './network.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit{
  title = 'Fichajes DIPC';
  loginForm: FormGroup;

  constructor (private network: NetworkService, private formBuilder: FormBuilder) {}

  ngOnInit(){
    this.loginForm = this.formBuilder.group({
      username: new FormControl('', Validators.required),
      password: new FormControl('', Validators.required)
    });
  }

  submit(value) {
    const response = this.network.login(value).subscribe( data => {
      console.log(data);
    }, error => {
      console.log(error);
    });
  }
}
