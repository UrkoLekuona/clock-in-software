import { Component, OnInit } from "@angular/core";

import { NetworkService } from "../network.service";

export interface User {
  username: string;
}

@Component({
  selector: "app-admin-home",
  templateUrl: "./admin-home.component.html",
  styleUrls: ["./admin-home.component.css"]
})
export class AdminHomeComponent implements OnInit {
  users: User[] = [{ username: "urkole" }, { username: "dfranco" }];

  constructor(private network: NetworkService) {}

  ngOnInit() {}

  isAdmin() {
    this.network.allUsers().subscribe(data => {
      console.log(data);
    }, error => {
      console.log(error);
    });
  }
}
