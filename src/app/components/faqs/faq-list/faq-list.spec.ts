import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FaqList } from './faq-list';

describe('FaqList', () => {
  let component: FaqList;
  let fixture: ComponentFixture<FaqList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FaqList],
    }).compileComponents();

    fixture = TestBed.createComponent(FaqList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
