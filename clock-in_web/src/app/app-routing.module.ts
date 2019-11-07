import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { HomeComponent } from "./home/home.component";
import { AppComponent } from "./app.component";
import { LoginComponent } from './login/login.component';
import { IssueComponent } from './issue/issue.component';
import { IssueFormComponent } from './issue-form/issue-form.component';
import { AuthGuard } from './auth-guard.guard';
import { AdminHomeComponent } from './admin-home/admin-home.component';
import { AdminGuard } from "./admin-guard.guard";

const routes: Routes = [
  {
    path: "",
    redirectTo: "login",
    pathMatch: "full"
  },
  {
    path: "login",
    component: LoginComponent
  },
  {
    path: "home",
    canActivate: [AuthGuard],
    component: HomeComponent
  },/*
  {
    path: "issue",
    canActivate: [AuthGuard],
    component: IssueComponent
  },*/
  {
    path: "issueForm",
    canActivate: [AuthGuard],
    component: IssueFormComponent
  },
  {
    path: "adminHome",
    canActivate: [AuthGuard, AdminGuard],
    component: AdminHomeComponent
  },
  { path: "**", redirectTo: "login", pathMatch: "full" }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
  providers: []
})
export class AppRoutingModule {}
