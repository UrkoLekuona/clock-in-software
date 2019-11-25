import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { ReactiveFormsModule, FormsModule } from "@angular/forms";
import { HttpClientModule, HTTP_INTERCEPTORS } from "@angular/common/http";

import {
  MatButtonModule,
  MatCheckboxModule,
  MatGridListModule,
  MatInputModule,
  MatIconModule,
  MatDialogModule,
  MatCardModule,
  MatDatepickerModule,
  MatNativeDateModule,
  MatSelectModule,
  MatFormFieldModule,
  MatTableModule,
  MatPaginatorModule,
  MatPaginatorIntl,
  MatTooltipModule,
  MatProgressSpinnerModule,
  MatDividerModule,
  DateAdapter,
  MAT_HAMMER_OPTIONS
} from "@angular/material";

import { MatTableExporterModule } from "mat-table-exporter";

import { NgxMaterialTimepickerModule } from 'ngx-material-timepicker';

import { AppComponent } from "./app.component";
import { AppRoutingModule } from "./app-routing.module";
import { LoginComponent } from "./login/login.component";
import { RequestInterceptor } from "./request.interceptor";
import { HomeComponent } from "./home/home.component";
import { IssueComponent } from "./issue/issue.component";
import { IssueFormComponent } from './issue-form/issue-form.component';
import { AdminHomeComponent } from './admin-home/admin-home.component';
import { MyDateAdapter } from "./my-date-adapter";
import { getSpanishPaginatorIntl } from './spanish-paginator-intl';
import { IssueDialogComponent } from "./issue-dialog/issue-dialog.component";

@NgModule({
  declarations: [AppComponent, LoginComponent, HomeComponent, IssueComponent, IssueDialogComponent, IssueFormComponent, AdminHomeComponent],
  imports: [
    BrowserModule,
    MatButtonModule,
    MatCheckboxModule,
    MatGridListModule,
    MatInputModule,
    MatIconModule,
    MatDialogModule,
    MatCardModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatTableModule,
    MatPaginatorModule,
    MatTooltipModule,
    MatSelectModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatTableExporterModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    FormsModule,
    HttpClientModule,
    NgxMaterialTimepickerModule
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: RequestInterceptor,
      multi: true
    },
    { provide: DateAdapter, useClass: MyDateAdapter },
    { provide: MAT_HAMMER_OPTIONS, useValue: { cssProps: { userSelect: true } } },
    { provide: MatPaginatorIntl, useValue: getSpanishPaginatorIntl() }
  ],
  bootstrap: [AppComponent],
  entryComponents: [IssueDialogComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppModule {
  constructor(private dateAdapter: DateAdapter<Date>) {
    this.dateAdapter.setLocale('es-ES');
  }
}
