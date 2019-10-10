import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { DataService } from 'src/app/services/data.service';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { Type } from 'src/app/models/type';
import { RawImportData } from 'src/app/models/common/raw-import-data';

@Component({
  selector: 'app-filter',
  templateUrl: './filter.component.html',
  styleUrls: ['./filter.component.scss']
})
export class FilterComponent implements OnInit {

  types: Type[];

  constructor(private data: DataService) { }

  ngOnInit() {
    this.clickfunction();
  }
  clickfunction(){
   	this.data.getInfoAPI('type',"","1","10").subscribe((data: RawImportData<Type>)=>{
      this.types=data.records
    }); 
  } 
}
